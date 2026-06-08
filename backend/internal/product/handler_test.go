package product

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func TestHandlerListAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeProductService{
		adminProducts: &AdminProductListResponse{
			Products: []AdminProductResponse{
				newAdminProductResponseForTest(1, ProductStatusActive),
				newAdminProductResponseForTest(2, ProductStatusStopped),
			},
		},
	}
	handler := NewHandler(service)
	router := gin.New()
	router.GET("/api/admin/products", handler.ListAdmin)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/products", nil)
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}

	var body struct {
		Data struct {
			Products []struct {
				ProductID int64         `json:"productId"`
				Status    ProductStatus `json:"status"`
			} `json:"products"`
		} `json:"data"`
		Error any `json:"error"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("json.Unmarshal returned error: %v", err)
	}
	if len(body.Data.Products) != 2 {
		t.Fatalf("products length = %d, want 2", len(body.Data.Products))
	}
	if body.Data.Products[1].Status != ProductStatusStopped {
		t.Fatalf("status = %s, want %s", body.Data.Products[1].Status, ProductStatusStopped)
	}
	if body.Error != nil {
		t.Fatalf("error = %#v, want nil", body.Error)
	}
}

func TestHandlerShowAdmin(t *testing.T) {
	tests := []struct {
		name          string
		path          string
		adminProduct  *AdminProductResponse
		apiErr        *apperror.APIError
		wantStatus    int
		wantProductID int64
	}{
		{
			name:          "管理者商品詳細を取得できる",
			path:          "/api/admin/products/1",
			adminProduct:  ptrAdminProductResponse(newAdminProductResponseForTest(1, ProductStatusStopped)),
			wantStatus:    http.StatusOK,
			wantProductID: 1,
		},
		{
			name:       "productIdが不正ならBad Request",
			path:       "/api/admin/products/invalid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "serviceがNot FoundならNot Foundを返す",
			path:       "/api/admin/products/1",
			apiErr:     apperror.NewNotFound("product not found"),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeProductService{adminProduct: tt.adminProduct, apiErr: tt.apiErr}
			handler := NewHandler(service)
			router := gin.New()
			router.GET("/api/admin/products/:id", handler.ShowAdmin)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.productID != tt.wantProductID {
				t.Fatalf("productID = %d, want %d", service.productID, tt.wantProductID)
			}
		})
	}
}

func TestHandlerCreateAdmin(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		apiErr     *apperror.APIError
		wantStatus int
		wantName   string
	}{
		{
			name:       "管理者が商品登録できる",
			body:       `{"name":"Keyboard","description":"Good","price":12000,"taxRateId":1,"categoryId":1,"stockQuantity":8,"lowStockThreshold":2,"status":"active"}`,
			wantStatus: http.StatusCreated,
			wantName:   "Keyboard",
		},
		{
			name:       "JSONが不正ならBad Request",
			body:       `{`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "serviceがValidation ErrorならBad Requestを返す",
			body:       `{"name":"","price":0,"taxRateId":1,"categoryId":1,"stockQuantity":0,"lowStockThreshold":0,"status":"active"}`,
			apiErr:     apperror.NewValidationError("validation error", []apperror.ErrorDetail{{Field: "name", Code: apperror.DetailRequired, Message: "name is required"}}),
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeProductService{
				adminProduct: ptrAdminProductResponse(newAdminProductResponseForTest(1, ProductStatusActive)),
				apiErr:       tt.apiErr,
			}
			handler := NewHandler(service)
			router := gin.New()
			router.POST("/api/admin/products", handler.CreateAdmin)

			req := httptest.NewRequest(http.MethodPost, "/api/admin/products", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusCreated {
				return
			}
			if service.createInput.Name != tt.wantName {
				t.Fatalf("name = %s, want %s", service.createInput.Name, tt.wantName)
			}
		})
	}
}

func TestHandlerUpdateAdmin(t *testing.T) {
	tests := []struct {
		name          string
		path          string
		body          string
		apiErr        *apperror.APIError
		wantStatus    int
		wantProductID int64
		wantStock     int
	}{
		{
			name:          "管理者が商品編集できる",
			path:          "/api/admin/products/1",
			body:          `{"stockQuantity":0,"lowStockThreshold":0}`,
			wantStatus:    http.StatusOK,
			wantProductID: 1,
			wantStock:     0,
		},
		{
			name:       "productIdが不正ならBad Request",
			path:       "/api/admin/products/invalid",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "JSONが不正ならBad Request",
			path:       "/api/admin/products/1",
			body:       `{`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "serviceがNot FoundならNot Foundを返す",
			path:       "/api/admin/products/1",
			body:       `{}`,
			apiErr:     apperror.NewNotFound("product not found"),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			product := newAdminProductResponseForTest(1, ProductStatusActive)
			product.StockQuantity = tt.wantStock
			service := &fakeProductService{adminProduct: &product, apiErr: tt.apiErr}
			handler := NewHandler(service)
			router := gin.New()
			router.PATCH("/api/admin/products/:id", handler.UpdateAdmin)

			req := httptest.NewRequest(http.MethodPatch, tt.path, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.productID != tt.wantProductID {
				t.Fatalf("productID = %d, want %d", service.productID, tt.wantProductID)
			}
			if service.updateInput.StockQuantity == nil || *service.updateInput.StockQuantity != tt.wantStock {
				t.Fatalf("stockQuantity = %v, want %d", service.updateInput.StockQuantity, tt.wantStock)
			}
		})
	}
}

func TestHandlerAdminProductStatus(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		method     string
		register   func(*gin.Engine, *Handler)
		wantStatus int
		wantAction string
	}{
		{
			name:   "管理者が販売停止できる",
			path:   "/api/admin/products/1/stop-selling",
			method: http.MethodPost,
			register: func(router *gin.Engine, handler *Handler) {
				router.POST("/api/admin/products/:id/stop-selling", handler.StopSellingAdmin)
			},
			wantStatus: http.StatusOK,
			wantAction: "stop",
		},
		{
			name:   "管理者が販売再開できる",
			path:   "/api/admin/products/1/resume-selling",
			method: http.MethodPost,
			register: func(router *gin.Engine, handler *Handler) {
				router.POST("/api/admin/products/:id/resume-selling", handler.ResumeSellingAdmin)
			},
			wantStatus: http.StatusOK,
			wantAction: "resume",
		},
		{
			name:   "productIdが不正ならBad Request",
			path:   "/api/admin/products/invalid/stop-selling",
			method: http.MethodPost,
			register: func(router *gin.Engine, handler *Handler) {
				router.POST("/api/admin/products/:id/stop-selling", handler.StopSellingAdmin)
			},
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeProductService{adminProduct: ptrAdminProductResponse(newAdminProductResponseForTest(1, ProductStatusStopped))}
			handler := NewHandler(service)
			router := gin.New()
			tt.register(router, handler)

			req := httptest.NewRequest(tt.method, tt.path, nil)
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.action != tt.wantAction {
				t.Fatalf("action = %s, want %s", service.action, tt.wantAction)
			}
		})
	}
}

type fakeProductService struct {
	productID     int64
	action        string
	createInput   AdminProductCreateInput
	updateInput   AdminProductUpdateInput
	adminProducts *AdminProductListResponse
	adminProduct  *AdminProductResponse
	apiErr        *apperror.APIError
}

func (s *fakeProductService) ListProducts(query ProductListQuery) ([]ProductResponse, *apperror.APIError) {
	return nil, nil
}

func (s *fakeProductService) GetProduct(id int64) (*ProductResponse, *apperror.APIError) {
	return nil, nil
}

func (s *fakeProductService) ListAdminProducts() (*AdminProductListResponse, *apperror.APIError) {
	return s.adminProducts, s.apiErr
}

func (s *fakeProductService) GetAdminProduct(id int64) (*AdminProductResponse, *apperror.APIError) {
	s.productID = id
	return s.adminProduct, s.apiErr
}

func (s *fakeProductService) CreateAdminProduct(input AdminProductCreateInput) (*AdminProductResponse, *apperror.APIError) {
	s.createInput = input
	return s.adminProduct, s.apiErr
}

func (s *fakeProductService) UpdateAdminProduct(productID int64, input AdminProductUpdateInput) (*AdminProductResponse, *apperror.APIError) {
	s.productID = productID
	s.updateInput = input
	return s.adminProduct, s.apiErr
}

func (s *fakeProductService) StopSellingAdminProduct(productID int64) (*AdminProductResponse, *apperror.APIError) {
	s.productID = productID
	s.action = "stop"
	return s.adminProduct, s.apiErr
}

func (s *fakeProductService) ResumeSellingAdminProduct(productID int64) (*AdminProductResponse, *apperror.APIError) {
	s.productID = productID
	s.action = "resume"
	return s.adminProduct, s.apiErr
}

func newAdminProductResponseForTest(productID int64, status ProductStatus) AdminProductResponse {
	now := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	return AdminProductResponse{
		ProductID:         productID,
		Name:              "Keyboard",
		Price:             12000,
		TaxRateID:         1,
		TaxRate:           0.1,
		CategoryID:        1,
		StockQuantity:     8,
		LowStockThreshold: 2,
		Status:            status,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
}

func ptrAdminProductResponse(product AdminProductResponse) *AdminProductResponse {
	return &product
}
