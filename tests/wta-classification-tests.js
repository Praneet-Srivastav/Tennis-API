/**
 * Test script for WTA Match Classification
 * Tests the different match types and classification rules
 */

const matchClassifierService = require('../services/match-classifier-service');

// Test cases covering all scenarios from user requirements
const testCases = [
    // Singles matches - Male vs Male
    {
        name: "Men's Singles",
        homePlayer: "Rafael Nadal",
        awayPlayer: "Novak Djokovic",
        expected: { isWTA: false, matchType: 'singles' }
    },
    
    // Singles matches - Female vs Female
    {
        name: "Women's Singles",
        homePlayer: "Serena Williams",
        awayPlayer: "Maria Sharapova",
        expected: { isWTA: true, matchType: 'singles' }
    },
    
    // Doubles matches - Male,Female vs Male,Female (Mixed Doubles)
    {
        name: "Mixed Doubles 1",
        homePlayer: "Rafael Nadal,Serena Williams",
        awayPlayer: "Novak Djokovic,Maria Sharapova",
        expected: { isWTA: true, matchType: 'doubles' } // Both females are WTA
    },
    
    // Doubles matches - female,male vs Male,Female (Mixed Doubles - different order)
    {
        name: "Mixed Doubles 2",
        homePlayer: "Venus Williams,Roger Federer",
        awayPlayer: "Andy Murray,Caroline Wozniacki",
        expected: { isWTA: true, matchType: 'doubles' } // Both females are WTA
    },
    
    // Doubles matches - Male,Female vs FeMale,male (Mixed Doubles - case variation)
    {
        name: "Mixed Doubles 3",
        homePlayer: "John Smith,Emma Johnson",
        awayPlayer: "Sarah Wilson,Mike Davis",
        expected: { isWTA: true, matchType: 'doubles' } // Assuming Emma, Sarah are detected as female
    },
    
    // Doubles matches - Female,Female vs Female,Female (All female doubles)
    {
        name: "Women's Doubles",
        homePlayer: "Serena Williams,Venus Williams",
        awayPlayer: "Maria Sharapova,Caroline Wozniacki",
        expected: { isWTA: true, matchType: 'doubles' }
    },
    
    // Test cases for edge scenarios
    {
        name: "Men's Doubles",
        homePlayer: "Rafael Nadal,Roger Federer",
        awayPlayer: "Novak Djokovic,Andy Murray",
        expected: { isWTA: false, matchType: 'doubles' }
    },
    
    // Mixed doubles where only one female is WTA
    {
        name: "Mixed Doubles - Partial WTA",
        homePlayer: "John Doe,Serena Williams",
        awayPlayer: "Mike Smith,Jane Unknown",
        expected: { isWTA: false, matchType: 'doubles' } // Only one female is WTA
    }
];

async function runTests() {
    console.log('🎾 Starting WTA Match Classification Tests...\n');
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        console.log(`  Match: ${testCase.homePlayer} vs ${testCase.awayPlayer}`);
        
        try {
            const result = await matchClassifierService.classifyMatch(
                testCase.homePlayer, 
                testCase.awayPlayer
            );
            
            // Check if result matches expected
            const isCorrect = 
                result.isWTA === testCase.expected.isWTA &&
                result.matchType === testCase.expected.matchType;
            
            if (isCorrect) {
                console.log(`  ✅ PASS - WTA: ${result.isWTA}, Type: ${result.matchType}`);
                console.log(`     Confidence: ${result.confidence}, Reason: ${result.reason}`);
                passed++;
            } else {
                console.log(`  ❌ FAIL - Expected WTA: ${testCase.expected.isWTA}, Got: ${result.isWTA}`);
                console.log(`     Expected Type: ${testCase.expected.matchType}, Got: ${result.matchType}`);
                console.log(`     Reason: ${result.reason}`);
                failed++;
            }
            
            // Show player details for debugging
            if (result.players) {
                console.log(`     Players:`);
                result.players.forEach(player => {
                    console.log(`       - ${player.name}: ${player.isWTA ? 'WTA' : 'Non-WTA'} (${player.confidence})`);
                });
            }
            
        } catch (error) {
            console.log(`  ❌ ERROR - ${error.message}`);
            failed++;
        }
        
        console.log('');
    }
    
    console.log('📊 Test Results Summary:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
    
    // Show classifier statistics
    const stats = matchClassifierService.getStats();
    console.log('\n📈 Classifier Statistics:');
    console.log(`   Total Classified: ${stats.totalClassified}`);
    console.log(`   Singles: ${stats.singles}`);
    console.log(`   Doubles: ${stats.doubles}`);
    console.log(`   Mixed Doubles: ${stats.mixedDoubles}`);
    console.log(`   WTA Matches: ${stats.wtaMatches}`);
    console.log(`   WTA Percentage: ${stats.wtaPercentage}%`);
    
    return { passed, failed };
}

module.exports = {
    runTests
};
