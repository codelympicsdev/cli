package cmd

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/codelympicsdev/api/database"
	"github.com/codelympicsdev/api/endpoints/attempts"
	"github.com/codelympicsdev/api/endpoints/challenges"
	"github.com/spf13/cobra"
)

var live bool

var attemptCmd = &cobra.Command{
	Use:     "attempt",
	Short:   "Respond with a solve attempt for a challenge",
	Example: `codelympics attempt 5d21d45f607b28ed7b25bf89 "main"`,
	Args:    cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		id := args[0]
		programm := args[1]

		client := http.Client{
			Timeout: 2 * time.Second,
		}

		var err error
		var req *http.Request

		if live {
			req, err = http.NewRequest("GET", "http://localhost:8080/v0/challenges/"+id+"/generate/live", nil)
			if err != nil {
				return err
			}
		} else {
			req, err = http.NewRequest("GET", "http://localhost:8080/v0/challenges/"+id+"/generate/test", nil)
			if err != nil {
				return err
			}
		}

		req.Header.Add("Authorization", "Bearer "+Token)

		resp, err := client.Do(req)
		if err != nil {
			return err
		}

		if resp.StatusCode != 200 {
			io.Copy(os.Stderr, resp.Body)
			return errors.New("request failed")
		}

		var input *database.AttemptInput
		var attemptID string
		var expectedOutput *database.AttemptOutput

		if live {
			var attempt *challenges.GenerateLiveResponse

			err = json.NewDecoder(resp.Body).Decode(&attempt)
			if err != nil {
				return err
			}

			input = attempt.Input
			attemptID = attempt.ID
		} else {
			var data *challenges.GenerateTestResponse

			err = json.NewDecoder(resp.Body).Decode(&data)
			if err != nil {
				return err
			}

			input = data.Input
			expectedOutput = data.ExpectedOutput
		}

		var prog *exec.Cmd

		if input.Arguments == nil {
			prog = exec.Command(programm)
		} else {
			prog = exec.Command(programm, input.Arguments...)
		}

		stdin := new(bytes.Buffer)
		stdout := new(bytes.Buffer)
		stderr := new(bytes.Buffer)

		prog.Stdin = stdin
		prog.Stdout = stdout
		prog.Stderr = stderr

		err = prog.Start()
		if err != nil {
			return err
		}

		_, err = io.Copy(stdin, strings.NewReader(input.Stdin))
		if err != nil {
			return err
		}

		err = prog.Wait()
		if err != nil {
			return err
		}

		var output = new(database.AttemptOutput)

		stdoutBytes, err := ioutil.ReadAll(stdout)
		if err != nil {
			fmt.Println("ey")
			return err
		}

		output.Stdout = string(stdoutBytes)

		stderrBytes, err := ioutil.ReadAll(stderr)
		if err != nil {
			return err
		}

		output.Stderr = string(stderrBytes)

		if live {
			var respReq = new(attempts.SubmitRequest)

			respReq.Output = output

			buf := new(bytes.Buffer)

			json.NewEncoder(buf).Encode(respReq)

			req, err := http.NewRequest("POST", "http://localhost:8080/v0/attempts/"+attemptID+"/submit", buf)
			if err != nil {
				return err
			}

			req.Header.Add("Content-Type", "application/json")
			req.Header.Add("Authorization", "Bearer "+Token)

			resp, err := client.Do(req)
			if err != nil {
				return err
			}

			if resp.StatusCode != 200 {
				io.Copy(os.Stderr, resp.Body)
				return errors.New("submission failed")
			}
		} else {
			if output.Stdout != expectedOutput.Stdout {
				return errors.New("stdout does not match: \nsupplied:\n" + output.Stdout + "\nexpected:\n" + expectedOutput.Stdout)
			}

			if output.Stderr != expectedOutput.Stderr {
				return errors.New("stderr does not match: \nsupplied:\n" + output.Stderr + "\nexpected:\n" + expectedOutput.Stderr)
			}
		}

		return nil
	},
}

func init() {
	attemptCmd.Flags().BoolVarP(&live, "live", "l", false, "if the attempt should be a test or live. You only have a set amount of live attempts per challenge")
	rootCmd.AddCommand(attemptCmd)
}
