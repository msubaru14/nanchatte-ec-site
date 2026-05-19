package response

import (
	"net/http"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"

	"github.com/gin-gonic/gin"
)

// 成功レスポンス
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Data:  data,
		Error: nil,
	})
}

// 作成成功レスポンス
func SuccessCreated(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Data:  data,
		Error: nil,
	})
}

// エラーレスポンス
func Error(c *gin.Context, status int, apiErr apperror.APIError) {
	c.JSON(status, Response{
		Data:  nil,
		Error: apiErr,
	})
}
