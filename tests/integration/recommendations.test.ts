import { prisma } from "../../src/database.js";
import { faker } from "@faker-js/faker";
import supertest from "supertest";
import app from "../../src/app.js";
import {
  buildRecommendation,
  insertManyRecommendations,
  upvoteRecommendations,
} from "../factories/recommendationFactory.js";

beforeEach(async () => {
  await prisma.recommendation.deleteMany();
});

const agent = supertest(app);

describe("recommendation integration tests", () => {
  it("should create a new recommendation and answer with status 201", async () => {
    const recommendation = buildRecommendation();
    const response = await agent.post("/recommendations").send(recommendation);
    expect(response.status).toBe(201);
  });

  it("should answer with 422 when name is not provided", async () => {
    const recommendation = {
      youtubeLink: faker.internet.url(),
    };
    const response = await agent.post("/recommendations").send(recommendation);
    expect(response.status).toBe(422);
  });

  it("should answer with 422 when youtube link is not provided", async () => {
    const recommendation = {
      name: faker.name.fullName(),
    };
    const response = await agent.post("/recommendations").send(recommendation);
    expect(response.status).toBe(422);
  });

  it("GET /recommendations - should return a list of recommendations and status 200", async () => {
    const response = await agent.get("/recommendations");
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  it("should return a random recommendation and status 200", async () => {
    const recommendation = buildRecommendation();
    await agent.post("/recommendations").send(recommendation);

    const response = await agent.get("/recommendations/random");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("youtubeLink");
    expect(response.body).toHaveProperty("score");
    expect(response.body).toHaveProperty("id");
  });

  it("should return a list of recommendations and status 200", async () => {
    const amount = 5;

    for (let i = 0; i < amount; i++) {
      const recommendation = buildRecommendation();
      await agent.post("/recommendations").send(recommendation);
    }

    await insertManyRecommendations();
    await upvoteRecommendations();

    const response = await agent.get(`/recommendations/top/${amount}`);
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(amount);
  });

  it("should return an empty list of recommendations and status 200", async () => {
    const recommendation = buildRecommendation();
    await agent.post("/recommendations").send(recommendation);

    const amount = 0;
    const response = await agent.get(`/recommendations/top/${amount}`);
    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBe(0);
  });

  it("should return a recommendation and status 200", async () => {
    const body = buildRecommendation();
    await agent.post("/recommendations").send(body);

    const recommendation = await prisma.recommendation.findFirst();
    const response = await agent.get(`/recommendations/${recommendation.id}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("name");
    expect(response.body).toHaveProperty("youtubeLink");
    expect(response.body).toHaveProperty("score");
    expect(response.body).toHaveProperty("id");
  });

  it("should return status 409 when recommendation is duplicate", async () => {
    const body = buildRecommendation();
    await agent.post("/recommendations").send(body);
    const response = await agent.post("/recommendations").send(body);
    expect(response.status).toBe(409);
  });

  it("should return status 404 when recommendation does not exist", async () => {
    const response = await agent.get(`/recommendations/40028922`);
    expect(response.status).toBe(404);
  });

  it("should answer with status 200", async () => {
    const body = buildRecommendation();
    await agent.post("/recommendations").send(body);

    const recommendation = await prisma.recommendation.findFirst();
    const response = await agent.post(
      `/recommendations/${recommendation.id}/upvote`
    );
    expect(response.status).toBe(200);
  });

  it("should answer with status 404 when recommendation does not exist", async () => {
    const response = await agent.post("/recommendations/40028922/upvote");
    expect(response.status).toBe(404);
  });

  it("should answer with status 200", async () => {
    const body = buildRecommendation();
    await agent.post("/recommendations").send(body);

    const recommendation = await prisma.recommendation.findFirst();
    const response = await agent.post(
      `/recommendations/${recommendation.id}/downvote`
    );
    expect(response.status).toBe(200);
  });

  it("should answer with status 404 when recommendation does not exist", async () => {
    const response = await agent.post(`/recommendations/40028922/downvote`);
    expect(response.status).toBe(404);
  });

  it("should answer with status 200 and remove recommendation when score is -5", async () => {
    const newRecommendation = buildRecommendation();
    const recommendationToBeSaved = {
      ...newRecommendation,
      score: -4,
    };

    await prisma.recommendation.create({
      data: recommendationToBeSaved,
    });

    const recommendation = await prisma.recommendation.findFirst({
      where: {
        score: { lte: -4 },
      },
    });

    const response = await agent.post(
      `/recommendations/${recommendation.id}/downvote`
    );
    expect(response.status).toBe(200);
  });

  it("should return status 404 when there are no recommendations", async () => {
    await prisma.recommendation.deleteMany();
    const response = await agent.get("/recommendations/random");
    expect(response.status).toBe(404);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
