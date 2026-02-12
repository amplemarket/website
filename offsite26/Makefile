APP_NAME = offsite26
DOCKER_REGISTRY = gcr.io/amplmkt-mgmt

.PHONY: docker-build
docker-build:
	docker build --file Dockerfile . \
		--tag ${APP_NAME}:latest \
		--tag ${DOCKER_REGISTRY}/${APP_NAME}:latest

.PHONY: docker-push
docker-push: docker-build
	docker push ${DOCKER_REGISTRY}/${APP_NAME}:latest
