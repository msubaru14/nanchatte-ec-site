package review

import "time"

type Status string

const (
	StatusDraft     Status = "draft"
	StatusPublished Status = "published"
	StatusHidden    Status = "hidden"
)

type Review struct {
	ID        int64 `gorm:"primaryKey"`
	UserID    int64 `gorm:"not null"`
	ProductID int64 `gorm:"not null"`
	Rating    int   `gorm:"not null"`
	Title     *string
	Comment   *string
	Status    Status `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
