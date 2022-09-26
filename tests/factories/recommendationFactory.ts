import { faker } from "@faker-js/faker";
import { Recommendation } from "@prisma/client";
import { prisma } from "../../src/database.js";
import { CreateRecommendationData } from "../../src/services/recommendationsService.js";

function buildRecommendation() {
  const recommendation: CreateRecommendationData = {
    name: faker.name.fullName(),
    youtubeLink: "https://youtu.be/Jhqj0TdxzQA",
  };

  return recommendation;
}

function buildRecommendationWithIdAndScore() {
  const recommendation: Recommendation = {
    name: faker.name.fullName(),
    youtubeLink: "https://youtu.be/Jhqj0TdxzQA",
    score: faker.datatype.number(),
    id: faker.datatype.number(),
  };

  return recommendation;
}

function getRandomArray(arrayLength: number = 10, buildWithId: boolean = true) {
  const array = [];

  for (let i = 0; i < faker.datatype.number(arrayLength); i++) {
    const recommendation = buildWithId
      ? buildRecommendationWithIdAndScore()
      : buildRecommendation();
    array.push(recommendation);
  }

  return array;
}

async function insertManyRecommendations() {
  const recommendations = getRandomArray(20, false);
  await prisma.recommendation.createMany({
    data: recommendations,
  });
}

async function upvoteRecommendations() {
  const recommendations = await prisma.recommendation.findMany({
    take: 10,
    orderBy: { name: "asc" },
  });

  const recommendationsIds = recommendations.map(
    (recommendation) => recommendation.id
  );

  await prisma.recommendation.updateMany({
    where: {
      id: {
        in: recommendationsIds,
      },
    },
    data: {
      score: 50,
    },
  });
}

export {
  buildRecommendation,
  buildRecommendationWithIdAndScore,
  getRandomArray,
  insertManyRecommendations,
  upvoteRecommendations,
};
