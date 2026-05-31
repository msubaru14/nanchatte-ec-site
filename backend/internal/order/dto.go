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

type DetailResult struct {
	OrderID           int64
	OrderNumber       string
	OrderStatus       OrderStatus
	TotalExcludingTax int
	TotalTax          int
	TotalIncludingTax int
	OrderedAt         time.Time
	Items             []DetailItemResult
}

type OrderSummaryResult struct {
	OrderID           int64
	OrderNumber       string
	OrderStatus       OrderStatus
	TotalIncludingTax int
	OrderedAt         time.Time
	ItemCount         int
}

type DetailItemResult struct {
	ProductID             int64
	ProductName           string
	ProductImageURL       *string
	MakerName             *string
	ModelNumber           *string
	UnitPriceExcludingTax int
	TaxRate               float64
	UnitPriceIncludingTax int
	Quantity              int
	SubtotalExcludingTax  int
	SubtotalTax           int
	SubtotalIncludingTax  int
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

type orderDetailResponse struct {
	OrderID           int64                     `json:"orderId"`
	OrderNumber       string                    `json:"orderNumber"`
	OrderStatus       OrderStatus               `json:"orderStatus"`
	TotalExcludingTax int                       `json:"totalExcludingTax"`
	TotalTax          int                       `json:"totalTax"`
	TotalIncludingTax int                       `json:"totalIncludingTax"`
	OrderedAt         time.Time                 `json:"orderedAt"`
	Items             []orderDetailItemResponse `json:"items"`
}

type orderDetailItemResponse struct {
	ProductID             int64   `json:"productId"`
	ProductName           string  `json:"productName"`
	ProductImageURL       *string `json:"productImageUrl"`
	MakerName             *string `json:"makerName"`
	ModelNumber           *string `json:"modelNumber"`
	UnitPriceExcludingTax int     `json:"unitPriceExcludingTax"`
	TaxRate               float64 `json:"taxRate"`
	UnitPriceIncludingTax int     `json:"unitPriceIncludingTax"`
	Quantity              int     `json:"quantity"`
	SubtotalExcludingTax  int     `json:"subtotalExcludingTax"`
	SubtotalTax           int     `json:"subtotalTax"`
	SubtotalIncludingTax  int     `json:"subtotalIncludingTax"`
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

func newOrderDetailResponse(result *DetailResult) orderDetailResponse {
	items := make([]orderDetailItemResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, orderDetailItemResponse{
			ProductID:             item.ProductID,
			ProductName:           item.ProductName,
			ProductImageURL:       item.ProductImageURL,
			MakerName:             item.MakerName,
			ModelNumber:           item.ModelNumber,
			UnitPriceExcludingTax: item.UnitPriceExcludingTax,
			TaxRate:               item.TaxRate,
			UnitPriceIncludingTax: item.UnitPriceIncludingTax,
			Quantity:              item.Quantity,
			SubtotalExcludingTax:  item.SubtotalExcludingTax,
			SubtotalTax:           item.SubtotalTax,
			SubtotalIncludingTax:  item.SubtotalIncludingTax,
		})
	}

	return orderDetailResponse{
		OrderID:           result.OrderID,
		OrderNumber:       result.OrderNumber,
		OrderStatus:       result.OrderStatus,
		TotalExcludingTax: result.TotalExcludingTax,
		TotalTax:          result.TotalTax,
		TotalIncludingTax: result.TotalIncludingTax,
		OrderedAt:         result.OrderedAt,
		Items:             items,
	}
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
