package order

import "time"

type CreateResult struct {
	OrderID           int64
	OrderNumber       string
	TotalIncludingTax int
	OrderedAt         time.Time
	Items             []ItemResult
}

type ListResult struct {
	Orders []OrderSummaryResult
}

type OrderSummaryResult struct {
	OrderID           int64
	OrderNumber       string
	OrderStatus       OrderStatus
	TotalIncludingTax int
	OrderedAt         time.Time
	ItemCount         int
}

type ItemResult struct {
	ProductID             int64
	ProductName           string
	ProductImageURL       *string
	Quantity              int
	UnitPriceIncludingTax int
	SubtotalIncludingTax  int
}

type listOrdersResponse struct {
	Orders []orderSummaryResponse `json:"orders"`
}

type orderSummaryResponse struct {
	OrderID           int64       `json:"orderId"`
	OrderNumber       string      `json:"orderNumber"`
	OrderStatus       OrderStatus `json:"orderStatus"`
	TotalIncludingTax int         `json:"totalIncludingTax"`
	OrderedAt         time.Time   `json:"orderedAt"`
	ItemCount         int         `json:"itemCount"`
}

type createOrderResponse struct {
	OrderID           int64               `json:"orderId"`
	OrderNumber       string              `json:"orderNumber"`
	TotalIncludingTax int                 `json:"totalIncludingTax"`
	OrderedAt         time.Time           `json:"orderedAt"`
	Items             []orderItemResponse `json:"items"`
}

type orderItemResponse struct {
	ProductID             int64   `json:"productId"`
	ProductName           string  `json:"productName"`
	ProductImageURL       *string `json:"productImageUrl"`
	Quantity              int     `json:"quantity"`
	UnitPriceIncludingTax int     `json:"unitPriceIncludingTax"`
	SubtotalIncludingTax  int     `json:"subtotalIncludingTax"`
}

func newListOrdersResponse(result *ListResult) listOrdersResponse {
	orders := make([]orderSummaryResponse, 0, len(result.Orders))
	for _, order := range result.Orders {
		orders = append(orders, orderSummaryResponse{
			OrderID:           order.OrderID,
			OrderNumber:       order.OrderNumber,
			OrderStatus:       order.OrderStatus,
			TotalIncludingTax: order.TotalIncludingTax,
			OrderedAt:         order.OrderedAt,
			ItemCount:         order.ItemCount,
		})
	}

	return listOrdersResponse{Orders: orders}
}

func newCreateOrderResponse(result *CreateResult) createOrderResponse {
	items := make([]orderItemResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, orderItemResponse{
			ProductID:             item.ProductID,
			ProductName:           item.ProductName,
			ProductImageURL:       item.ProductImageURL,
			Quantity:              item.Quantity,
			UnitPriceIncludingTax: item.UnitPriceIncludingTax,
			SubtotalIncludingTax:  item.SubtotalIncludingTax,
		})
	}

	return createOrderResponse{
		OrderID:           result.OrderID,
		OrderNumber:       result.OrderNumber,
		TotalIncludingTax: result.TotalIncludingTax,
		OrderedAt:         result.OrderedAt,
		Items:             items,
	}
}
