/**
 * Simple test for WTA classification rules
 */

const simpleWTAClassifier = require('../services/simple-wta-classifier');

// Test cases based on your exact requirements
const testCases = [
    // Singles examples
    { home: "Rafael Nadal", away: "Novak Djokovic", expected: "", description: "Male vs Male" },
    { home: "Serena Williams", away: "Maria Sharapova", expected: "WTA", description: "Female vs Female" },
    
    // Doubles examples  
    { home: "Serena Williams,Venus Williams", away: "Maria Sharapova,Caroline Wozniacki", expected: "WTA", description: "Female,Female vs Female,Female" },
    { home: "Rafael Nadal,Roger Federer", away: "Novak Djokovic,Andy Murray", expected: "", description: "Male,Male vs Male,Male" },
    
    // Mixed doubles examples
    { home: "Rafael Nadal,Serena Williams", away: "Novak Djokovic,Maria Sharapova", expected: "WTA", description: "Male,Female vs Male,Female (both females WTA)" },
    { home: "Venus Williams,Roger Federer", away: "Andy Murray,Caroline Wozniacki", expected: "WTA", description: "Female,Male vs Male,Female (both females WTA)" },
    { home: "John Smith,Serena Williams", away: "Mike Jones,Unknown Female", expected: "", description: "Male,Female vs Male,Female (only one female WTA)" }
];

async function runSimpleTests() {
    console.log('🎾 Testing Simple WTA Classification Rules...\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.description}`);
        console.log(`  Match: ${testCase.home} vs ${testCase.away}`);
        
        try {
            const result = await simpleWTAClassifier.getWTAStatus(testCase.home, testCase.away);
            
            if (result === testCase.expected) {
                console.log(`  ✅ PASS - Result: "${result}"`);
                passed++;
            } else {
                console.log(`  ❌ FAIL - Expected: "${testCase.expected}", Got: "${result}"`);
                failed++;
            }
        } catch (error) {
            console.log(`  ❌ ERROR - ${error.message}`);
            failed++;
        }
        
        console.log('');
    }
    
    console.log('📊 Test Results:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    return { passed, failed };
}

// Test Excel data processing
async function testExcelProcessing() {
    console.log('\n📋 Testing Excel Data Processing...\n');
    
    const sampleExcelData = [
        { homeopponent: "Yuriko Miyazaki", awayopponent: "Celine Naef", tournament: "Birmingham" },
        { homeopponent: "Rafael Nadal", awayopponent: "Novak Djokovic", tournament: "French Open" },
        { homeopponent: "Serena Williams,Venus Williams", awayopponent: "Maria Sharapova,Caroline Wozniacki", tournament: "Wimbledon" }
    ];
    
    const results = await simpleWTAClassifier.processExcelData(sampleExcelData);
    
    console.log('Excel Processing Results:');
    results.forEach((row, index) => {
        console.log(`${index + 1}. ${row.homeopponent} vs ${row.awayopponent}`);
        console.log(`   Tournament: ${row.tournament}`);
        console.log(`   WTA?: "${row['WTA?']}"`);
        console.log('');
    });
}

async function main() {
    try {
        const testResults = await runSimpleTests();
        await testExcelProcessing();
        
        if (testResults.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log(`⚠️ ${testResults.failed} test(s) failed.`);
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = { runSimpleTests };
