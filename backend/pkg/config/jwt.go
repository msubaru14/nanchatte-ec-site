package config

import "os"

const jwtSecretEnv = "JWT_SECRET"

func JWTSecret() string {
	return os.Getenv(jwtSecretEnv)
}
