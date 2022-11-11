import { acceptLicenseTerms, deleteCustomDatabase } from '../../../helpers/database';
import { CliPage, AddRedisDatabasePage, MyRedisDatabasePage } from '../../../pageObjects';
import {
    commonUrl,
    ossStandaloneConfig
} from '../../../helpers/conf';
import { rte } from '../../../helpers/constants';
import { deleteStandaloneDatabaseApi } from '../../../helpers/api/api-database';

const cliPage = new CliPage();
const addRedisDatabasePage =  new AddRedisDatabasePage();
const myRedisDatabasePage = new MyRedisDatabasePage();

let index = '0';
let databaseEndpoint = `${ossStandaloneConfig.host}:${ossStandaloneConfig.port}`;
const cliMessage = [
    'Pinging Redis server on ',
    databaseEndpoint,
    'Connected.',
    'Ready to execute commands.'
];

fixture `CLI logical database`
    .meta({ type: 'regression', rte: rte.standalone })
    .page(commonUrl)
    .beforeEach(async() => {
        await acceptLicenseTerms();
    })
    .afterEach(async() => {
        // Delete database
        await deleteCustomDatabase(`${ossStandaloneConfig.databaseName} [${index}]`);
    });
test
    .after(async() => {
        // Delete database
        await deleteStandaloneDatabaseApi(ossStandaloneConfig);
    })('Verify that working with logical DBs, user can not see 0 DB index in CLI', async t => {
        await addRedisDatabasePage.addLogicalRedisDatabase(ossStandaloneConfig, index);
        await myRedisDatabasePage.clickOnDBByName(ossStandaloneConfig.databaseName);
        // Open CLI
        await t.click(cliPage.cliExpandButton);
        // Verify that user can not see 0 DB index in CLI
        for (const text of cliMessage) {
            await t.expect(cliPage.cliArea.textContent).contains(text, 'No DB index is not displayed in the CLI message');
        }
        await t.expect(cliPage.cliDbIndex.visible).eql(false, 'No DB index before the > character in CLI is not displayed');
        await t.expect(cliPage.cliEndpoint.textContent).eql(databaseEndpoint, 'Database index 0 is not displayed in the CLI endpoint');
    });
test('Verify that working with logical DBs, user can see N DB index in CLI', async t => {
    index = '1';
    databaseEndpoint = `${ossStandaloneConfig.host}:${ossStandaloneConfig.port}[${index}]`;

    await addRedisDatabasePage.addLogicalRedisDatabase(ossStandaloneConfig, index);
    await myRedisDatabasePage.clickOnDBByName(`${ossStandaloneConfig.databaseName  } [${index}]`);
    // Open CLI
    await t.click(cliPage.cliExpandButton);
    // Verify that user can see DB index in CLI
    for (const text of cliMessage) {
        await t.expect(cliPage.cliArea.textContent).contains(text, 'DB index is not displayed in the CLI message');
    }
    await t.expect(cliPage.cliDbIndex.textContent).eql(`[${index}] `, 'DB index before the > character in CLI is not displayed');
    await t.expect(cliPage.cliEndpoint.textContent).eql(databaseEndpoint, 'Database index is not displayed in the CLI endpoint');
});
test('Verify that user can see DB index in the endpoint in CLI header is automatically changed when switched to another logical DB', async t => {
    index = '2';
    const indexAfter = '3';
    databaseEndpoint = `${ossStandaloneConfig.host}:${ossStandaloneConfig.port}[${index}]`;
    const databaseEndpointAfter = `${ossStandaloneConfig.host}:${ossStandaloneConfig.port}[${indexAfter}]`;

    await addRedisDatabasePage.addLogicalRedisDatabase(ossStandaloneConfig, index);
    await myRedisDatabasePage.clickOnDBByName(`${ossStandaloneConfig.databaseName  } [${index}]`);

    // Open CLI and verify that user can see DB index in CLI
    await t.click(cliPage.cliExpandButton);
    await t.expect(cliPage.cliDbIndex.textContent).eql(`[${index}] `, 'DB index before the > character in CLI is not displayed');
    // Re-creates client in CLI
    await t.click(cliPage.cliCollapseButton);
    await t.click(cliPage.cliExpandButton);
    // Verify that when user re-creates client in CLI the new client is connected to the DB index selected for the DB by default
    await t.expect(cliPage.cliDbIndex.textContent).eql(`[${index}] `, 'The new client is not connected to the DB index selected for the DB by default');

    // Open CLI and verify the database index in the endpoint
    await t.expect(cliPage.cliEndpoint.textContent).eql(databaseEndpoint, `The endpoint in CLI header not contains ${index} index`);
    // Minimize and maximize CLI
    await t.click(cliPage.minimizeCliButton);
    await t.click(cliPage.cliExpandButton);
    // Verify that user can work with selected logical DB in CLI when he minimazes and then maximizes the CLI
    await t.expect(cliPage.cliEndpoint.textContent).eql(databaseEndpoint, `The endpoint in CLI header not contains ${index} index after minimize`);

    // Open CLI and verify the database index in the endpoint
    await t.expect(cliPage.cliEndpoint.textContent).eql(databaseEndpoint, `The endpoint in CLI header not contains ${index} index`);
    // Switch to another logical database and check endpoint
    await t.typeText(cliPage.cliCommandInput, `Select ${indexAfter}`, { paste: true });
    await t.pressKey('enter');
    await t.expect(cliPage.cliEndpoint.textContent).eql(databaseEndpointAfter, `The endpoint in CLI header is not automatically changed to the new ${indexAfter}`);
});
