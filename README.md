[![CI Status](https://github.com/codelympicsdev/cli/workflows/ci/badge.svg)](https://github.com/codelympicsdev/cli/actions)

# codelympics cli

This is the CLI for https://codelympics.dev.

## installation

```
npm i -g @codelympics/cli
```

```
yarn global add @codelympics/cli
```

## usage

> If you are looking for a walkthrough on how to use codelympics, follow the guide at https://codelympics.dev/get-started

### 🔑 sign in

This authenticates you with the codelympics.dev servers so you can submit challenge attempts.

```
codelympics login
```

This will open a browser window where you can sign in with your credentials.

### 🚪 sign out

This removes the locally stored authentication token.

```
codelympics logout
```

### 🧑 auth status

This displays if you are currently signed in or not.

```
codelympics status
```

### ✉️ test and submit attempt

There are two modes of operation - testing your code and submitting a live attempt. The live attempt will send results back to the server to be evaluated there. The local attempt will evaluate results locally and display any problems to you.

```
codelympics run <challenge_id> <executable> [arguments...]

Options:
  -l, --live  actually submit the result. This can not be undone and can only be done a limited amount of times
  -h, --help  output usage information
```

To submit a test attempt for the challenge `5dbf60791c9d440000ffa243` using a Go program you would execute this command:

```
codelympics run 5dbf60791c9d440000ffa243 go run main.go
```

## licence

(c) 2019 codelympics.dev

This project is licenced under the MIT licence. More information can be found in the `LICENCE` file
