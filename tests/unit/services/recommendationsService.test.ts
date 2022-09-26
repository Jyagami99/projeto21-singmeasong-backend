import { jest } from "@jest/globals";
import { recommendationService } from "../../../src/services/recommendationsService.js";
import { recommendationRepository } from "../../../src/repositories/recommendationRepository.js";
import { conflictError, notFoundError } from "../../../src/utils/errorUtils.js";
import { prisma } from "../../../src/database.js";
import {
  buildRecommendation,
  buildRecommendationWithIdAndScore,
  getRandomArray,
} from "../../factories/recommendationFactory.js";

beforeEach(async () => {
  await prisma.recommendation.deleteMany();
});

describe("recommendations service tests suite", () => {
  jest.spyOn(recommendationRepository, "create").mockResolvedValue();

  it("should create a recommendation", async () => {
    const recommendation = buildRecommendation();

    jest
      .spyOn(recommendationRepository, "findByName")
      .mockResolvedValueOnce(null);

    const result = await recommendationService.insert(recommendation);
    expect(recommendationRepository.create).toBeCalled();
    expect(recommendationRepository.create).toBeCalledWith(recommendation);
    expect(result).toBeUndefined();
  });

  it("should not create a duplicated recommendation", async () => {
    const recommendation = buildRecommendation();
    const insertedRecommendation = buildRecommendationWithIdAndScore();

    jest
      .spyOn(recommendationRepository, "findByName")
      .mockResolvedValueOnce(insertedRecommendation);

    try {
      await recommendationService.insert(recommendation);
    } catch (error) {
      expect(error).toEqual(
        conflictError("Recommendations names must be unique")
      );
    }
  });

  it("should upvote a recommendation", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    jest
      .spyOn(recommendationRepository, "find")
      .mockResolvedValueOnce(recommendation);
    jest
      .spyOn(recommendationRepository, "updateScore")
      .mockResolvedValueOnce(undefined);

    const result = await recommendationService.upvote(recommendation.id);
    expect(recommendationRepository.updateScore).toBeCalled();
    expect(recommendationRepository.updateScore).toBeCalledWith(
      recommendation.id,
      "increment"
    );
    expect(result).toBeUndefined();
  });

  it("should fail to upvote a recommendation and throw not found error", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    jest.spyOn(recommendationRepository, "find").mockResolvedValueOnce(null);

    try {
      await recommendationService.upvote(recommendation.id);
    } catch (error) {
      expect(error).toEqual(notFoundError());
    }
  });

  it("should downvote a recommendation", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    jest
      .spyOn(recommendationRepository, "find")
      .mockResolvedValueOnce(recommendation);
    jest
      .spyOn(recommendationRepository, "updateScore")
      .mockResolvedValueOnce(recommendation);

    const result = await recommendationService.downvote(recommendation.id);
    expect(recommendationRepository.updateScore).toBeCalled();
    expect(recommendationRepository.updateScore).toBeCalledWith(
      recommendation.id,
      "decrement"
    );
    expect(result).toBeUndefined();
  });

  it("should fail to downvote a recommendation and throw not found error", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    jest.spyOn(recommendationRepository, "find").mockResolvedValueOnce(null);

    try {
      await recommendationService.downvote(recommendation.id);
    } catch (error) {
      expect(error).toEqual(notFoundError());
    }
  });

  it("should downvote a recommendation and remove it", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    recommendation.score = -6;

    jest
      .spyOn(recommendationRepository, "find")
      .mockResolvedValueOnce(recommendation);
    jest
      .spyOn(recommendationRepository, "updateScore")
      .mockResolvedValueOnce(recommendation);
    jest
      .spyOn(recommendationRepository, "remove")
      .mockResolvedValueOnce(undefined);

    const result = await recommendationService.downvote(recommendation.id);
    expect(recommendationRepository.updateScore).toBeCalled();
    expect(recommendationRepository.updateScore).toBeCalledWith(
      recommendation.id,
      "decrement"
    );
    expect(recommendationRepository.remove).toBeCalled();
    expect(recommendationRepository.remove).toBeCalledWith(recommendation.id);
    expect(result).toBeUndefined();
  });

  it("should get a recommendation by id", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    jest
      .spyOn(recommendationRepository, "find")
      .mockResolvedValueOnce(recommendation);

    const result = await recommendationService.getById(recommendation.id);
    expect(recommendationRepository.find).toBeCalled();
    expect(recommendationRepository.find).toBeCalledWith(recommendation.id);
    expect(result).toBe(recommendation);
  });

  it("should fail to find a recommendation by id and throw not found error", async () => {
    const recommendation = buildRecommendationWithIdAndScore();
    jest.spyOn(recommendationRepository, "find").mockResolvedValueOnce(null);

    try {
      await recommendationService.getById(recommendation.id);
    } catch (error) {
      expect(error).toEqual(notFoundError());
    }
  });

  it("should get all recommendations", async () => {
    const recommendations = getRandomArray();
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    const result = await recommendationService.get();
    expect(recommendationRepository.findAll).toBeCalled();
    expect(result).toBe(recommendations);
    expect(result.length).toBe(recommendations.length);
  });

  it("should get top recommendations", async () => {
    const recommendations = getRandomArray();

    recommendations.sort((a, b) => (b.score = a.score));
    const topThree = recommendations.slice(0, 3);

    jest
      .spyOn(recommendationRepository, "getAmountByScore")
      .mockResolvedValueOnce(topThree);

    const result = await recommendationService.getTop(topThree.length);
    expect(recommendationRepository.getAmountByScore).toBeCalled();
    expect(result).toBe(topThree);
    expect(result.length).toBe(topThree.length);
  });

  it("should get random recommendations", async () => {
    const recommendations = getRandomArray();
    const DEFAULT_RANDOM_VALUE = 0.5;
    const DEFAULT_INDEX = Math.floor(
      DEFAULT_RANDOM_VALUE * recommendations.length
    );

    jest.spyOn(global.Math, "random").mockReturnValue(DEFAULT_RANDOM_VALUE);
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    const result = await recommendationService.getRandom();
    expect(result).toBe(recommendations[DEFAULT_INDEX]);
  });

  it("should get random recommendations with score greater than 10", async () => {
    const recommendations = getRandomArray();
    const DEFAULT_RANDOM_VALUE = 0.5;
    const DEFAULT_INDEX = Math.floor(
      DEFAULT_RANDOM_VALUE * recommendations.length
    );

    jest.spyOn(global.Math, "random").mockReturnValue(DEFAULT_RANDOM_VALUE);
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    const result = await recommendationService.getRandom();
    expect(result).toBe(recommendations[DEFAULT_INDEX]);
  });

  it("should get random recommendations with score greater than 10 when random is less than 0.7", async () => {
    const recommendations = getRandomArray();
    const DEFAULT_RANDOM_VALUE = 0.5;
    const DEFAULT_INDEX = Math.floor(
      DEFAULT_RANDOM_VALUE * recommendations.length
    );

    jest.spyOn(global.Math, "random").mockReturnValue(DEFAULT_RANDOM_VALUE);
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    const result = await recommendationService.getRandom();
    expect(result).toBe(recommendations[DEFAULT_INDEX]);
  });

  it("should get random recommendations with score less than or equal to 10 when random is greater than 0.7", async () => {
    const recommendations = getRandomArray();
    const DEFAULT_RANDOM_VALUE = 0.8;
    const DEFAULT_INDEX = Math.floor(
      DEFAULT_RANDOM_VALUE * recommendations.length
    );

    jest.spyOn(global.Math, "random").mockReturnValue(DEFAULT_RANDOM_VALUE);
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    const result = await recommendationService.getRandom();
    expect(result).toBe(recommendations[DEFAULT_INDEX]);
  });

  it("should fail to get random recommendations and throw not found error", async () => {
    const recommendations = [];
    const DEFAULT_RANDOM_VALUE = 0.9;

    jest.spyOn(global.Math, "random").mockReturnValue(DEFAULT_RANDOM_VALUE);
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    try {
      await recommendationService.getRandom();
    } catch (error) {
      expect(error).toEqual(notFoundError());
    }
  });

  it("should return all recommendations when score filter is not applied", async () => {
    const recommendations = getRandomArray();
    const DEFAULT_RANDOM_VALUE = 0.9;
    const DEFAULT_INDEX = Math.floor(
      DEFAULT_RANDOM_VALUE * recommendations.length
    );

    jest.spyOn(global.Math, "random").mockReturnValue(DEFAULT_RANDOM_VALUE);
    jest.spyOn(recommendationRepository, "findAll").mockResolvedValueOnce([]);
    jest
      .spyOn(recommendationRepository, "findAll")
      .mockResolvedValueOnce(recommendations);

    const result = await recommendationService.getRandom();
    expect(result).toBe(recommendations[DEFAULT_INDEX]);
  });
});

afterAll(async () => {
  await prisma.recommendation.deleteMany();
  await prisma.$disconnect();
});
