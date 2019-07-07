package main

import "fmt"

func main() {
	var one float64
	_, err := fmt.Scanln(&one)
	if err != nil {
		panic(err.Error())
	}

	var two float64
	_, err = fmt.Scanln(&two)
	if err != nil {
		panic(err.Error())
	}

	fmt.Print(one + two)
}
