const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../client/assets/logo.svg');
const outputPath = path.join(__dirname, '../client/android/app/src/main/res/drawable/ic_stat_icon.xml');

try {
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Simple regex to extract path data
    // We assume the first path is the background and skip it.
    // The regex looks for d="..."
    const comments = svgContent.match(/d="([^"]+)"/g);

    if (!comments || comments.length < 2) {
        console.error("Not enough paths found in SVG to extract icon.");
        process.exit(1);
    }

    let xmlContent = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="1024"
    android:viewportHeight="1024">
`;

    // Skip the first path (background)
    for (let i = 1; i < comments.length; i++) {
        const dMatch = comments[i].match(/d="([^"]+)"/);
        if (dMatch && dMatch[1]) {
            xmlContent += `    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="${dMatch[1]}" />
`;
        }
    }

    xmlContent += `</vector>`;

    fs.writeFileSync(outputPath, xmlContent);
    console.log(`Successfully generated ${outputPath}`);

} catch (error) {
    console.error("Error processing SVG:", error);
    process.exit(1);
}
