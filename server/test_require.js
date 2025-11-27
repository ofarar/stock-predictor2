try {
    require('./services/financeAPI');
    console.log("Successfully required financeAPI");
} catch (error) {
    console.error("Error requiring financeAPI:", error);
}
