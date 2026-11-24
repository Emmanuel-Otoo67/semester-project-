FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
COPY src/ src/
RUN ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
RUN useradd --system --uid 10001 --no-create-home libtrack
COPY --from=build /workspace/target/libtrack-api-*.jar /app/libtrack-api.jar
USER libtrack

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar /app/libtrack-api.jar"]
