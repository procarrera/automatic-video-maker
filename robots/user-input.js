const readline = require("readline-sync");

async function robot(content) {
  content.searchTerm = askAndReturnSearchTerm();
  content.prefix = askAndReturnPrefix();

  function askAndReturnSearchTerm() {
    return readline.question("Type a Wikipedia search term: ");
  }

  function askAndReturnPrefix() {
    const prefixed = ["Who is", "What is", "The histoy of"];
    const selectedPrefixIndex = readline.keyInSelect(
      prefixed,
      "Choose one option: "
    );
    const selectedPrefixText = prefixed[selectedPrefixIndex];
    return selectedPrefixText;
  }
  return content;
}

module.exports = robot;
