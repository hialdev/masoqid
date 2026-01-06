package utils

import (
	"os"
	"regexp"
)

func ScanACLFromFiles(files []string) ([]string, error) {
	reg := regexp.MustCompile(`DoACL\("([^"]+)"\)`)

	aclSet := map[string]bool{}

	for _, fp := range files {
		content, err := os.ReadFile(fp)
		if err != nil {
			return nil, err
		}

		matches := reg.FindAllStringSubmatch(string(content), -1)
		for _, m := range matches {
			acl := m[1]
			aclSet[acl] = true
		}
	}

	// Convert map ke []string
	result := []string{}
	for acl := range aclSet {
		result = append(result, acl)
	}

	return result, nil
}
