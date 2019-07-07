package cmd

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/kirsle/configdir"
	"github.com/spf13/cobra"
)

// config
type config struct {
	Token string `json:"token,omitempty"`
}

// Config is the main configuration
var Config = &config{}
var configFilePath = filepath.Join(configdir.LocalConfig("codelympics", "settings.json"))

// Token for auth
var Token string

func init() {
	cobra.OnInitialize(initConfig)
	rootCmd.PersistentFlags().StringVar(&configFilePath, "config", configFilePath, "config file (default is "+configFilePath+")")
	rootCmd.PersistentFlags().StringVar(&Token, "token", "", "authentication token")
}

func initConfig() {
	openConfig()
}

var rootCmd = &cobra.Command{
	Use:   "codelympics",
	Short: "Codelympics is a platform to test your programming skill.",
	Long:  `Test your skill, master challenges and get a streak. New challenges daily at https://codelympics.dev`,
}

// Execute the cli
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
