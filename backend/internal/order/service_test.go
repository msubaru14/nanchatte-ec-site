package order

import (
	"errors"
	"testing"
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/cart"
	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

func TestServiceCreateOrder(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name                     string
		setup                    func(*fakeRepository)
		wantCode                 string
		wantOrderCount           int
		wantOrderItemCount       int
		wantDeletedCartItemCount int
		wantStock                int
		wantTotalIncludingTax    int
	}{
		{
			name:                     "カート内商品を注文確定できる",
			wantOrderCount:           1,
			wantOrderItemCount:       1,
			wantDeletedCartItemCount: 1,
			wantStock:                3,
			wantTotalIncludingTax:    2200,
		},
		{
			name: "空カートならEMPTY_CARTを返す",
			setup: func(repository *fakeRepository) {
				repository.cart.Items = nil
			},
			wantCode:  apperror.CodeEmptyCart,
			wantStock: 5,
		},
		{
			name: "ユーザーCartが存在しない場合もEMPTY_CARTを返す",
			setup: func(repository *fakeRepository) {
				repository.cart.UserID = 2
			},
			wantCode:  apperror.CodeEmptyCart,
			wantStock: 5,
		},
		{
			name: "販売停止商品が含まれる場合は注文失敗する",
			setup: func(repository *fakeRepository) {
				repository.cart.Items[0].Product.Status = product.ProductStatusStopped
			},
			wantCode:  apperror.CodeValidationError,
			wantStock: 5,
		},
		{
			name: "在庫不足ならOUT_OF_STOCKを返し部分更新しない",
			setup: func(repository *fakeRepository) {
				repository.cart.Items[0].Quantity = 6
			},
			wantCode:  apperror.CodeOutOfStock,
			wantStock: 5,
		},
		{
			name: "在庫減算時に対象外になった場合もOUT_OF_STOCKを返しtransactionを巻き戻す",
			setup: func(repository *fakeRepository) {
				repository.decrementRowsAffected = 0
			},
			wantCode:  apperror.CodeOutOfStock,
			wantStock: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			if tt.setup != nil {
				tt.setup(repository)
			}
			service := &Service{
				repository: repository,
				now:        func() time.Time { return orderedAt },
				orderNumberGenerator: func(time.Time) (string, error) {
					return "ORD-20260528-A8K3D2", nil
				},
			}

			result, apiErr := service.CreateOrder(1)

			assertAPIErrorCode(t, apiErr, tt.wantCode)
			if tt.wantCode == "" {
				if result == nil {
					t.Fatal("result = nil, want order result")
				}
				if result.TotalIncludingTax != tt.wantTotalIncludingTax {
					t.Fatalf("total including tax = %d, want %d", result.TotalIncludingTax, tt.wantTotalIncludingTax)
				}
				assertCreatedOrder(t, repository.orders[0], orderedAt)
				assertCreatedOrderItem(t, repository.orderItems[0])
				assertDeletedCartItemIDs(t, repository.deletedCartItemIDs, []int64{100})
			}
			if got := len(repository.orders); got != tt.wantOrderCount {
				t.Fatalf("order count = %d, want %d", got, tt.wantOrderCount)
			}
			if got := len(repository.orderItems); got != tt.wantOrderItemCount {
				t.Fatalf("order item count = %d, want %d", got, tt.wantOrderItemCount)
			}
			if got := len(repository.deletedCartItemIDs); got != tt.wantDeletedCartItemCount {
				t.Fatalf("deleted cart item count = %d, want %d", got, tt.wantDeletedCartItemCount)
			}
			if got := repository.stockByProductID[1]; got != tt.wantStock {
				t.Fatalf("stock = %d, want %d", got, tt.wantStock)
			}
		})
	}
}

func TestServiceListOrders(t *testing.T) {
	t.Parallel()

	older := time.Date(2026, 5, 29, 12, 0, 0, 0, time.UTC)
	newer := time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name           string
		userID         int64
		orders         []OrderSummaryResult
		wantOrderIDs   []int64
		wantItemCounts []int
	}{
		{
			name:   "ログインユーザー自身の注文のみordered_at DESCで取得する",
			userID: 1,
			orders: []OrderSummaryResult{
				{OrderID: 1, OrderNumber: "ORD-20260529-AAAAAA", OrderStatus: OrderStatusOrdered, TotalIncludingTax: 2200, OrderedAt: older, ItemCount: 2},
				{OrderID: 2, OrderNumber: "ORD-20260530-BBBBBB", OrderStatus: OrderStatusOrdered, TotalIncludingTax: 3300, OrderedAt: newer, ItemCount: 3},
				{OrderID: 3, OrderNumber: "ORD-20260530-CCCCCC", OrderStatus: OrderStatusOrdered, TotalIncludingTax: 4400, OrderedAt: newer, ItemCount: 4},
			},
			wantOrderIDs:   []int64{2, 3, 1},
			wantItemCounts: []int{3, 4, 2},
		},
		{
			name:         "注文が0件なら空配列を返す",
			userID:       2,
			orders:       []OrderSummaryResult{},
			wantOrderIDs: []int64{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			repository.listOrdersByUserID[tt.userID] = tt.orders
			service := &Service{repository: repository}

			result, apiErr := service.ListOrders(tt.userID)

			assertAPIErrorCode(t, apiErr, "")
			assertOrderSummaryIDs(t, result.Orders, tt.wantOrderIDs)
			for i, want := range tt.wantItemCounts {
				if result.Orders[i].ItemCount != want {
					t.Fatalf("item count at %d = %d, want %d", i, result.Orders[i].ItemCount, want)
				}
			}
		})
	}
}

func TestServiceGetOrderDetail(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name           string
		userID         int64
		orderID        int64
		setup          func(*fakeRepository)
		wantCode       string
		wantOrderID    int64
		wantItemNames  []string
		wantModelValue string
	}{
		{
			name:           "ログインユーザー自身の注文詳細を取得できる",
			userID:         1,
			orderID:        10,
			wantOrderID:    10,
			wantItemNames:  []string{"HHKB Professional", "Trackball"},
			wantModelValue: "PD-KB800",
		},
		{
			name:     "他ユーザーの注文はNOT_FOUNDを返す",
			userID:   2,
			orderID:  10,
			wantCode: apperror.CodeNotFound,
		},
		{
			name:     "存在しない注文はNOT_FOUNDを返す",
			userID:   1,
			orderID:  99,
			wantCode: apperror.CodeNotFound,
		},
		{
			name:    "repositoryエラーはINTERNAL_SERVER_ERRORを返す",
			userID:  1,
			orderID: 10,
			setup: func(repository *fakeRepository) {
				repository.findOrderErr = errors.New("db error")
			},
			wantCode: apperror.CodeInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			repository.detailOrders = []Order{
				{
					ID:                10,
					UserID:            1,
					OrderNumber:       "ORD-20260530-A8K3D2",
					OrderStatus:       OrderStatusOrdered,
					TotalExcludingTax: 82000,
					TotalTax:          8200,
					TotalIncludingTax: 90200,
					OrderedAt:         orderedAt,
					Items: []OrderItem{
						{
							ID:                    1,
							ProductID:             1,
							ProductName:           "HHKB Professional",
							ModelNumber:           stringPtr("PD-KB800"),
							UnitPriceExcludingTax: 36000,
							TaxRate:               0.1,
							UnitPriceIncludingTax: 39600,
							Quantity:              2,
							SubtotalExcludingTax:  72000,
							SubtotalTax:           7200,
							SubtotalIncludingTax:  79200,
						},
						{
							ID:                    2,
							ProductID:             2,
							ProductName:           "Trackball",
							UnitPriceExcludingTax: 10000,
							TaxRate:               0.1,
							UnitPriceIncludingTax: 11000,
							Quantity:              1,
							SubtotalExcludingTax:  10000,
							SubtotalTax:           1000,
							SubtotalIncludingTax:  11000,
						},
					},
				},
			}
			if tt.setup != nil {
				tt.setup(repository)
			}
			service := &Service{repository: repository}

			result, apiErr := service.GetOrderDetail(tt.userID, tt.orderID)

			assertAPIErrorCode(t, apiErr, tt.wantCode)
			if tt.wantCode != "" {
				return
			}
			if result.OrderID != tt.wantOrderID {
				t.Fatalf("order ID = %d, want %d", result.OrderID, tt.wantOrderID)
			}
			if len(result.Items) != len(tt.wantItemNames) {
				t.Fatalf("item count = %d, want %d", len(result.Items), len(tt.wantItemNames))
			}
			for i, want := range tt.wantItemNames {
				if result.Items[i].ProductName != want {
					t.Fatalf("item name at %d = %q, want %q", i, result.Items[i].ProductName, want)
				}
			}
			if result.Items[0].ModelNumber == nil || *result.Items[0].ModelNumber != tt.wantModelValue {
				t.Fatalf("model number = %v, want %q", result.Items[0].ModelNumber, tt.wantModelValue)
			}
		})
	}
}

func assertCreatedOrder(t *testing.T, order Order, orderedAt time.Time) {
	t.Helper()

	if order.OrderNumber != "ORD-20260528-A8K3D2" {
		t.Fatalf("order number = %q, want %q", order.OrderNumber, "ORD-20260528-A8K3D2")
	}
	if order.OrderStatus != OrderStatusOrdered {
		t.Fatalf("order status = %q, want %q", order.OrderStatus, OrderStatusOrdered)
	}
	if order.TotalExcludingTax != 2000 || order.TotalTax != 200 || order.TotalIncludingTax != 2200 {
		t.Fatalf("order total = (%d, %d, %d), want (2000, 200, 2200)", order.TotalExcludingTax, order.TotalTax, order.TotalIncludingTax)
	}
	if !order.OrderedAt.Equal(orderedAt) {
		t.Fatalf("ordered at = %s, want %s", order.OrderedAt, orderedAt)
	}
}

func assertCreatedOrderItem(t *testing.T, item OrderItem) {
	t.Helper()

	if item.OrderID != 1 {
		t.Fatalf("order ID = %d, want 1", item.OrderID)
	}
	if item.ProductID != 1 || item.ProductName != "Keyboard" {
		t.Fatalf("product snapshot = (%d, %q), want (1, %q)", item.ProductID, item.ProductName, "Keyboard")
	}
	if item.UnitPriceExcludingTax != 1000 || item.TaxRate != 0.10 || item.UnitPriceIncludingTax != 1100 {
		t.Fatalf("unit price snapshot = (%d, %.2f, %d), want (1000, 0.10, 1100)", item.UnitPriceExcludingTax, item.TaxRate, item.UnitPriceIncludingTax)
	}
	if item.Quantity != 2 {
		t.Fatalf("quantity = %d, want 2", item.Quantity)
	}
	if item.SubtotalExcludingTax != 2000 || item.SubtotalTax != 200 || item.SubtotalIncludingTax != 2200 {
		t.Fatalf("subtotal = (%d, %d, %d), want (2000, 200, 2200)", item.SubtotalExcludingTax, item.SubtotalTax, item.SubtotalIncludingTax)
	}
}

func assertDeletedCartItemIDs(t *testing.T, got []int64, want []int64) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("deleted cart item IDs = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("deleted cart item IDs = %v, want %v", got, want)
		}
	}
}

func TestBuildOrderItems(t *testing.T) {
	t.Parallel()

	imageURL := "https://example.com/product.png"
	makerName := "PFU"
	modelNumber := "PD-KB800"
	items := []cart.CartItem{
		{
			ID:        10,
			ProductID: 1,
			Quantity:  2,
			Product: product.Product{
				ID:                1,
				Name:              "HHKB Professional",
				ImageURL:          &imageURL,
				MakerName:         &makerName,
				ModelNumber:       &modelNumber,
				PriceExcludingTax: 2000,
				StockQuantity:     5,
				Status:            product.ProductStatusActive,
				TaxRate:           product.TaxRate{Rate: 0.10},
			},
		},
	}

	orderItems, itemIDs, totalExcludingTax, totalTax, totalIncludingTax, err := buildOrderItems(items)
	if err != nil {
		t.Fatalf("buildOrderItems() error = %v", err)
	}

	if len(orderItems) != 1 {
		t.Fatalf("order item count = %d, want 1", len(orderItems))
	}
	if itemIDs[0] != 10 {
		t.Fatalf("item ID = %d, want 10", itemIDs[0])
	}

	orderItem := orderItems[0]
	if orderItem.ProductName != "HHKB Professional" {
		t.Fatalf("product name = %q, want %q", orderItem.ProductName, "HHKB Professional")
	}
	if orderItem.ProductImageURL != &imageURL {
		t.Fatalf("product image URL pointer mismatch")
	}
	if orderItem.UnitPriceIncludingTax != 2200 {
		t.Fatalf("unit price including tax = %d, want 2200", orderItem.UnitPriceIncludingTax)
	}
	if orderItem.SubtotalExcludingTax != 4000 || orderItem.SubtotalTax != 400 || orderItem.SubtotalIncludingTax != 4400 {
		t.Fatalf("subtotal = (%d, %d, %d), want (4000, 400, 4400)", orderItem.SubtotalExcludingTax, orderItem.SubtotalTax, orderItem.SubtotalIncludingTax)
	}
	if totalExcludingTax != 4000 || totalTax != 400 || totalIncludingTax != 4400 {
		t.Fatalf("total = (%d, %d, %d), want (4000, 400, 4400)", totalExcludingTax, totalTax, totalIncludingTax)
	}
}

func TestGenerateUniqueOrderNumber(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)
	repository := newFakeRepository()
	repository.existingOrderNumbers["ORD-20260528-AAAAAA"] = true
	generatedNumbers := []string{"ORD-20260528-AAAAAA", "ORD-20260528-BBBBBB"}
	service := &Service{
		orderNumberGenerator: func(time.Time) (string, error) {
			generated := generatedNumbers[0]
			generatedNumbers = generatedNumbers[1:]
			return generated, nil
		},
	}

	got, err := service.generateUniqueOrderNumber(repository, orderedAt)
	if err != nil {
		t.Fatalf("generateUniqueOrderNumber() error = %v", err)
	}
	if got != "ORD-20260528-BBBBBB" {
		t.Fatalf("order number = %q, want %q", got, "ORD-20260528-BBBBBB")
	}
}

type fakeRepository struct {
	cart                  cart.Cart
	orders                []Order
	orderItems            []OrderItem
	stockByProductID      map[int64]int
	deletedCartItemIDs    []int64
	existingOrderNumbers  map[string]bool
	listOrdersByUserID    map[int64][]OrderSummaryResult
	detailOrders          []Order
	findOrderErr          error
	decrementRowsAffected int64
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		cart: cart.Cart{
			ID:     10,
			UserID: 1,
			Items: []cart.CartItem{
				{
					ID:        100,
					CartID:    10,
					ProductID: 1,
					Quantity:  2,
					Product: product.Product{
						ID:                1,
						Name:              "Keyboard",
						PriceExcludingTax: 1000,
						StockQuantity:     5,
						Status:            product.ProductStatusActive,
						TaxRate:           product.TaxRate{Rate: 0.10},
					},
				},
			},
		},
		stockByProductID:      map[int64]int{1: 5},
		existingOrderNumbers:  make(map[string]bool),
		listOrdersByUserID:    make(map[int64][]OrderSummaryResult),
		decrementRowsAffected: 1,
	}
}

func (r *fakeRepository) Transaction(fn func(orderRepository) error) error {
	snapshot := r.snapshot()
	if err := fn(r); err != nil {
		r.restore(snapshot)
		return err
	}

	return nil
}

func (r *fakeRepository) FindCartByUserIDForUpdate(userID int64) (*cart.Cart, error) {
	if r.cart.UserID != userID {
		return nil, gorm.ErrRecordNotFound
	}

	return &r.cart, nil
}

func (r *fakeRepository) CreateOrder(order *Order) error {
	if r.existingOrderNumbers[order.OrderNumber] {
		return errors.New("duplicate order number")
	}

	order.ID = int64(len(r.orders) + 1)
	r.orders = append(r.orders, *order)
	r.existingOrderNumbers[order.OrderNumber] = true
	return nil
}

func (r *fakeRepository) CreateOrderItems(items []OrderItem) error {
	r.orderItems = append(r.orderItems, items...)
	return nil
}

func (r *fakeRepository) DecrementProductStock(productID int64, quantity int) (int64, error) {
	if r.decrementRowsAffected == 0 {
		return 0, nil
	}
	if r.stockByProductID[productID] < quantity {
		return 0, nil
	}

	r.stockByProductID[productID] -= quantity
	return 1, nil
}

func (r *fakeRepository) DeleteCartItems(cartID int64, itemIDs []int64) error {
	r.deletedCartItemIDs = append(r.deletedCartItemIDs, itemIDs...)
	return nil
}

func (r *fakeRepository) OrderNumberExists(orderNumber string) (bool, error) {
	return r.existingOrderNumbers[orderNumber], nil
}

func (r *fakeRepository) ListOrdersByUserID(userID int64) ([]OrderSummaryResult, error) {
	orders := append([]OrderSummaryResult(nil), r.listOrdersByUserID[userID]...)
	for i := 0; i < len(orders); i++ {
		for j := i + 1; j < len(orders); j++ {
			if orders[i].OrderedAt.Before(orders[j].OrderedAt) {
				orders[i], orders[j] = orders[j], orders[i]
			}
		}
	}

	return orders, nil
}

func (r *fakeRepository) FindOrderByIDAndUserID(orderID int64, userID int64) (*Order, error) {
	if r.findOrderErr != nil {
		return nil, r.findOrderErr
	}

	for _, order := range r.detailOrders {
		if order.ID == orderID && order.UserID == userID {
			order.Items = append([]OrderItem(nil), order.Items...)
			for i := 0; i < len(order.Items); i++ {
				for j := i + 1; j < len(order.Items); j++ {
					if order.Items[j].ID < order.Items[i].ID {
						order.Items[i], order.Items[j] = order.Items[j], order.Items[i]
					}
				}
			}
			return &order, nil
		}
	}

	return nil, gorm.ErrRecordNotFound
}

type fakeRepositorySnapshot struct {
	orders               []Order
	orderItems           []OrderItem
	stockByProductID     map[int64]int
	deletedCartItemIDs   []int64
	existingOrderNumbers map[string]bool
}

func (r *fakeRepository) snapshot() fakeRepositorySnapshot {
	return fakeRepositorySnapshot{
		orders:               append([]Order(nil), r.orders...),
		orderItems:           append([]OrderItem(nil), r.orderItems...),
		stockByProductID:     cloneIntMap(r.stockByProductID),
		deletedCartItemIDs:   append([]int64(nil), r.deletedCartItemIDs...),
		existingOrderNumbers: cloneBoolMap(r.existingOrderNumbers),
	}
}

func (r *fakeRepository) restore(snapshot fakeRepositorySnapshot) {
	r.orders = snapshot.orders
	r.orderItems = snapshot.orderItems
	r.stockByProductID = snapshot.stockByProductID
	r.deletedCartItemIDs = snapshot.deletedCartItemIDs
	r.existingOrderNumbers = snapshot.existingOrderNumbers
}

func cloneIntMap(source map[int64]int) map[int64]int {
	cloned := make(map[int64]int, len(source))
	for key, value := range source {
		cloned[key] = value
	}

	return cloned
}

func cloneBoolMap(source map[string]bool) map[string]bool {
	cloned := make(map[string]bool, len(source))
	for key, value := range source {
		cloned[key] = value
	}

	return cloned
}

func assertAPIErrorCode(t *testing.T, apiErr *apperror.APIError, wantCode string) {
	t.Helper()

	if wantCode == "" {
		if apiErr != nil {
			t.Fatalf("api error = %+v, want nil", apiErr)
		}
		return
	}
	if apiErr == nil {
		t.Fatalf("api error = nil, want code %q", wantCode)
	}
	if apiErr.Code != wantCode {
		t.Fatalf("api error code = %q, want %q", apiErr.Code, wantCode)
	}
}

func assertOrderSummaryIDs(t *testing.T, orders []OrderSummaryResult, want []int64) {
	t.Helper()

	if len(orders) != len(want) {
		t.Fatalf("order IDs length = %d, want %d", len(orders), len(want))
	}
	for i, order := range orders {
		if order.OrderID != want[i] {
			t.Fatalf("order ID at %d = %d, want %d", i, order.OrderID, want[i])
		}
	}
}
