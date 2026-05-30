package order

import "time"

type CreateResult struct {
	OrderID           int64
	OrderNumber       string
	TotalIncludingTax int
	OrderedAt         time.Time
	Items             []ItemResult
}

type ItemResult struct {
	ProductID             int64
	ProductName           string
	ProductImageURL       *string
	Quantity              int
	UnitPriceIncludingTax int
	SubtotalIncludingTax  int
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
