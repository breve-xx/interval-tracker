.DEFAULT_GOAL := help

# ─── Colours ──────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

# ─── Targets ──────────────────────────────────────────────────────────────────

## Show this help message
.PHONY: help
help:
	@echo "Usage: make $(CYAN)<target>$(RESET)\n"
	@awk '/^## /{desc=substr($$0,4); next} /^\.PHONY:/{next} desc && /^[a-zA-Z_-]+:/{printf "  $(CYAN)%-14s$(RESET) %s\n", substr($$1,1,length($$1)-1), desc; desc=""} !desc{desc=""}' $(MAKEFILE_LIST)

## Install npm dependencies
.PHONY: install
install:
	npm install

## Start live-reloading dev server (opens browser automatically)
.PHONY: serve
serve: node_modules
	npm run dev -- --open

## Run unit tests once
.PHONY: test
test: node_modules
	npm test

## Run unit tests in watch mode
.PHONY: test-watch
test-watch: node_modules
	npm run test:watch

## Run tests with coverage report
.PHONY: coverage
coverage: node_modules
	npm run test:coverage

## Remove node_modules and generated artefacts
.PHONY: clean
clean:
	rm -rf node_modules coverage

# ─── Internal: ensure deps are installed ─────────────────────────────────────
node_modules: package.json
	npm install
	@touch node_modules
