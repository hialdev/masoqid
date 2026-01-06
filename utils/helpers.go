package utils

func GetOptionalString(val string) *string {
	if val == "" {
		return nil
	}
	return &val
}

