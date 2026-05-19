package auth

import "time"

type User struct {
	ID           int64  `gorm:"primaryKey"`
	Name         string `gorm:"not null"`
	Email        string `gorm:"not null;unique"`
	PasswordHash string `gorm:"not null"`
	DeletedAt    *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
	Roles        []Role `gorm:"many2many:user_roles;"`
}

type Role struct {
	ID        int64  `gorm:"primaryKey"`
	Name      string `gorm:"not null;unique"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type UserRole struct {
	UserID int64 `gorm:"primaryKey"`
	RoleID int64 `gorm:"primaryKey"`
}

type RefreshToken struct {
	ID        int64  `gorm:"primaryKey"`
	UserID    int64  `gorm:"not null"`
	TokenHash string `gorm:"not null;unique"`
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
	UpdatedAt time.Time
	User      User
}

type Cart struct {
	ID        int64 `gorm:"primaryKey"`
	UserID    int64 `gorm:"not null;unique"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
