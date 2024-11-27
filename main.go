package main

import (
	"embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
)

//go:embed static/*
var staticFiles embed.FS

//go:embed static/index.html
var indexHTML string

type LotterySystem struct {
	mu      sync.Mutex
	Players []string
}

type DrawRequest struct {
	Count       int      `json:"count"`
	Players     []string `json:"players"`
	ElapsedTime int64    `json:"elapsedTime"`
}

type DrawResponse struct {
	Winners []string `json:"winners"`
	Seed    string   `json:"seed"`
}

// 从drand获取随机数作为随机源
func getDrandRandomness() (int64, error) {
	resp, err := http.Get("https://drand.cloudflare.com/public/latest")
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var result struct {
		Randomness string `json:"randomness"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}

	// 解码十六进制字符串
	randomBytes, err := hex.DecodeString(result.Randomness)
	if err != nil {
		return 0, err
	}

	// 使用所有字节计算一个种子值
	var seed int64
	for i := 0; i < len(randomBytes); i++ {
		seed = (seed << 8) | int64(randomBytes[i])
		if (i+1)%8 == 0 {
			seed ^= seed >> 32
		}
	}

	return seed, nil
}

// 从CSPRNG获取随机数作为随机源
func getCSPRNGRandomness() (int64, error) {
	resp, err := http.Get("https://csprng.xyz/v1/api")
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var result struct {
		Data string `json:"Data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}

	// 解码Base64字符串
	randomBytes, err := base64.StdEncoding.DecodeString(result.Data)
	if err != nil {
		return 0, err
	}

	// 使用所有字节计算一个种子值
	var seed int64
	for i := 0; i < len(randomBytes); i++ {
		// 循环左移并异或
		seed = (seed << 8) | int64(randomBytes[i])
		// 每8字节做一次异或混合
		if (i+1)%8 == 0 {
			seed ^= seed >> 32
		}
	}

	return seed, nil
}

func (ls *LotterySystem) Draw(count int, elapsedTime int64) ([]string, string, error) {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	if count > len(ls.Players) {
		return nil, "", fmt.Errorf("抽奖人数超过参与人数")
	}

	// 获取���个随机源
	drandSeed, err := getDrandRandomness()
	if err != nil {
		return nil, "", err
	}
	csprngSeed, err := getCSPRNGRandomness()
	if err != nil {
		return nil, "", err
	}

	// 创建两个独立的随机数生成器
	log.Println("drandseed", drandSeed)
	r1 := rand.New(rand.NewSource(drandSeed))
	log.Println("csprngseed", csprngSeed)
	r2 := rand.New(rand.NewSource(csprngSeed))

	// 创建参与者索引切片
	indices := make([]int, len(ls.Players))
	for i := range indices {
		indices[i] = i
	}

	// 第一轮洗牌
	for round := 0; round < 3; round++ {
		// 使用第一个随机源洗牌
		for i := len(indices) - 1; i > 0; i-- {
			j := r1.Intn(i + 1)
			indices[i], indices[j] = indices[j], indices[i]
		}

		// 使用第二个随机源再次洗牌
		for i := len(indices) - 1; i > 0; i-- {
			j := r2.Intn(i + 1)
			indices[i], indices[j] = indices[j], indices[i]
		}

		// 随机决定是否反转切片
		if r1.Intn(2) == 1 {
			for i, j := 0, len(indices)-1; i < j; i, j = i+1, j-1 {
				indices[i], indices[j] = indices[j], indices[i]
			}
		}

		// 随机交换一些位置
		swapCount := r2.Intn(len(indices)/2) + 1
		for i := 0; i < swapCount; i++ {
			a := r1.Intn(len(indices))
			b := r2.Intn(len(indices))
			indices[a], indices[b] = indices[b], indices[a]
		}
	}

	log.Println("elapsedTime", elapsedTime)
	// 使用时间戳作为新的随机源进行二次打散
	timeRand := rand.New(rand.NewSource(elapsedTime))

	// 第二轮洗牌（使用时间随机源）
	for i := len(indices) - 1; i > 0; i-- {
		j := timeRand.Intn(i + 1)
		indices[i], indices[j] = indices[j], indices[i]
	}

	// 再次随机交换一些位置
	swapCount := timeRand.Intn(len(indices)/2) + 1
	for i := 0; i < swapCount; i++ {
		a := timeRand.Intn(len(indices))
		b := timeRand.Intn(len(indices))
		indices[a], indices[b] = indices[b], indices[a]
	}

	// 选择获奖者
	winners := make([]string, count)
	for i := 0; i < count; i++ {
		winners[i] = ls.Players[indices[i]]
	}

	// 生成种子字符串，包含所有随机源
	seed := fmt.Sprintf("%x-%x-%x", drandSeed, csprngSeed, elapsedTime)

	return winners, seed, nil
}

func main() {
	ls := &LotterySystem{}

	staticContent, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()

	// 根路由处理
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			tmpl, err := template.New("index").Parse(indexHTML)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			tmpl.Execute(w, nil)
			return
		}
		// 其他路径返回 404
		http.NotFound(w, r)
	})

	// 静态文件处理
	fileServer := http.FileServer(http.FS(staticContent))
	mux.HandleFunc("/static/", func(w http.ResponseWriter, r *http.Request) {
		// 设置正确的 Content-Type
		switch {
		case strings.HasSuffix(r.URL.Path, ".css"):
			w.Header().Set("Content-Type", "text/css")
		case strings.HasSuffix(r.URL.Path, ".js"):
			w.Header().Set("Content-Type", "application/javascript")
		}
		// 移除 /static/ 前缀
		r.URL.Path = strings.TrimPrefix(r.URL.Path, "/static")
		fileServer.ServeHTTP(w, r)
	})

	// API endpoints
	mux.HandleFunc("/api/draw", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req DrawRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		ls.Players = req.Players
		winners, seed, err := ls.Draw(req.Count, req.ElapsedTime)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		json.NewEncoder(w).Encode(DrawResponse{
			Winners: winners,
			Seed:    seed,
		})
	})

	// 启动服务器
	log.Printf("Server starting on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
