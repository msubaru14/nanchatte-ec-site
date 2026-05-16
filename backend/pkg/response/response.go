package response

// 共通レスポンス構造
type Response struct {
	Data  interface{} `json:"data"`
	Error interface{} `json:"error"`
}
