const algorithmia = require("algorithmia");
const algorithmiaApiKey = require("../credentials/algorithmia.json").apiKey;
const sentenceBoundaryDetection = require("sbd");

const watsonKey = require("../credentials/watson.json");
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1");
const { IamAuthenticator } = require("ibm-watson/auth");

const nlu = new NaturalLanguageUnderstandingV1({
  version: "2019-07-12",
  authenticator: new IamAuthenticator({
    apikey: watsonKey.apikey,
  }),
  url: watsonKey.url,
});

const state = require("./state");

async function robot() {
  const content = state.load();
  await fetchContentFromWikipidia(content);
  sanitizeContent(content);
  breakContentIntoSentences(content);
  limitMaximumSentences(content);
  await fetchKeywordsOfAllSentences(content);

  state.save(content);

  async function fetchContentFromWikipidia(content) {
    const algorithmiaAuthenticated = algorithmia(algorithmiaApiKey);
    const wikipidiaAlgorithm = algorithmiaAuthenticated.algo(
      "web/WikipediaParser/0.1.2"
    );
    const wikipediaResponse = await wikipidiaAlgorithm.pipe(content.searchTerm);
    const wikipediaContent = wikipediaResponse.get();
    content.sourceContentOriginal = wikipediaContent.content;
  }

  function sanitizeContent(content) {
    const withoutBlankLinesAndMarkdown = removeBlanklinesAndMarkdown(
      content.sourceContentOriginal
    );
    const withoutDatesinParentheses = removeDatesInParentheses(
      withoutBlankLinesAndMarkdown
    );

    content.sourceContentSanitized = withoutDatesinParentheses;

    function removeBlanklinesAndMarkdown(text) {
      const allLines = text.split("\n");
      const withoutBlankLinesAndMarkdown = allLines.filter((line) => {
        if (line.trim().length === 0 || line.trim().startsWith("=")) {
          return false;
        }
        return true;
      });
      return withoutBlankLinesAndMarkdown.join(" ");
    }

    function removeDatesInParentheses(text) {
      return text
        .replace(/\((?:\([^()]*\)|[^()])*\)/gm, "")
        .replace(/  /g, " ");
    }
  }

  function breakContentIntoSentences(content) {
    content.sentences = [];
    const sentences = sentenceBoundaryDetection.sentences(
      content.sourceContentSanitized
    );
    sentences.forEach((sentence) => {
      content.sentences.push({
        text: sentence,
        keywords: [],
        images: [],
      });
    });
  }

  function limitMaximumSentences(content) {
    content.sentences = content.sentences.slice(0, content.maximumSentences);
  }

  async function fetchKeywordsOfAllSentences(content) {
    for (const sentence of content.sentences) {
      sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text);
    }
  }

  async function fetchWatsonAndReturnKeywords(sentence) {
    return new Promise((resolve, reject) => {
      nlu.analyze(
        {
          text: sentence,
          features: {
            keywords: {},
          },
          language: "en",
        },
        (error, response) => {
          if (error) {
            throw error;
          }
          const keywords = response.result.keywords.map((keyword) => {
            return keyword.text;
          });
          resolve(keywords);
        }
      );
    });
  }
}

module.exports = robot;
