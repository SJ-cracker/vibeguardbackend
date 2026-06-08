// Test snippet for VibeGuard verification
function processData(input) {
  try {
    // Dangerous eval (Security Scanner rule)
    const result = eval(input);
    console.log(result);
  } catch (e) {
    // Empty catch block (Bug Predictor rule)
  }
}

processData('1 + 1');
