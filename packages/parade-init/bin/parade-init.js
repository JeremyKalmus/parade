#!/usr/bin/env node

/**
 * parade-init CLI entry point
 *
 * This script is the main entry for the `npx parade-init` command.
 * It orchestrates the initialization of a new Parade project.
 */

const { main } = require('../lib/index.js');

// Run main and handle errors
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  });

// Export for testing
module.exports = { main };
