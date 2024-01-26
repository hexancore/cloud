PROJECT = hexancore-cloud

init_tmp:
	mkdir -p ./tmp/redis
	chmod 0777 -R ./tmp
	chmod 0777 -R ./docker
up:
	docker compose -p $(PROJECT) --env-file ./docker/.env up -d --wait --wait-timeout 5
down:
	docker compose -p $(PROJECT) down -t 2

act:
	act workflow_dispatch --input releaseType=minor
