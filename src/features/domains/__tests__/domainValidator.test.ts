import { describe, expect, it } from "vitest";
import { isValidDomain, sanitizeDomain, validateNewDomain } from "../utils/domainValidator";

describe("domainValidator", () => {
  describe("sanitizeDomain", () => {
    it("should trim and convert to lowercase", () => {
      expect(sanitizeDomain("   REDDIT.COM   ")).toBe("reddit.com");
    });

    it("should strip http:// and https:// protocols", () => {
      expect(sanitizeDomain("https://twitter.com")).toBe("twitter.com");
      expect(sanitizeDomain("http://facebook.com")).toBe("facebook.com");
    });

    it("should strip leading www.", () => {
      expect(sanitizeDomain("www.instagram.com")).toBe("instagram.com");
      expect(sanitizeDomain("https://www.youtube.com")).toBe("youtube.com");
    });

    it("should strip path, query and hash params", () => {
      expect(sanitizeDomain("https://reddit.com/r/popular?sort=top#header")).toBe("reddit.com");
    });
  });

  describe("isValidDomain", () => {
    it("should return true for valid domain names", () => {
      expect(isValidDomain("reddit.com")).toBe(true);
      expect(isValidDomain("sub.domain.co.uk")).toBe(true);
      expect(isValidDomain("news.ycombinator.com")).toBe(true);
    });

    it("should return false for invalid domain names", () => {
      expect(isValidDomain("")).toBe(false);
      expect(isValidDomain("invalid_domain")).toBe(false);
      expect(isValidDomain("-invalid.com")).toBe(false);
      expect(isValidDomain("http://reddit.com")).toBe(false); // un-sanitized
    });
  });

  describe("validateNewDomain", () => {
    const existing = ["twitter.com", "facebook.com"];

    it("should accept valid new domain", () => {
      const result = validateNewDomain("https://www.reddit.com/r/all", existing);
      expect(result).toEqual({
        valid: true,
        sanitized: "reddit.com",
      });
    });

    it("should reject empty or whitespace input", () => {
      const result = validateNewDomain("   ", existing);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Informe um domínio válido, como reddit.com.");
    });

    it("should reject duplicate domain", () => {
      const result = validateNewDomain("twitter.com", existing);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Esse domínio já está na lista.");
    });

    it("should reject duplicate domain with www prefix", () => {
      const result = validateNewDomain("https://www.twitter.com", existing);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Esse domínio já está na lista.");
    });
  });
});
