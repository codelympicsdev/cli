package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

func openConfig() {
	file, err := os.Open(configFilePath)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}

	err = json.NewDecoder(file).Decode(&Config)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}

	if Token == "" {
		Token = Config.Token
	}
}

func saveConfig() {
	file, err := os.Open(configFilePath)
	defer file.Close()
	if err != nil {
		if os.IsNotExist(err) {
			err = nil
			os.MkdirAll(filepath.Dir(configFilePath), 0744)
			file, err = os.Create(configFilePath)
			defer file.Close()
			if err != nil {
				fmt.Println(err.Error())
				os.Exit(1)
			}
		} else {
			fmt.Println(err.Error())
			os.Exit(1)
		}
	}

	err = json.NewEncoder(file).Encode(Config)
	if err != nil {
		fmt.Println(err.Error())
		os.Exit(1)
	}
}
