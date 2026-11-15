import assert from 'assert';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

// Test the bridge functions directly without needing a live port listener
import {
  getMlStatus,
  syncDatasetWithMl,
  classifyWithSvm,
  trainSvm,
  classifyWithRoberta,
  classifyAllModels
} from './mlBridge.js';

console.log('=== RUNNING EXPRESS ML BRIDGE & PIPELINE INTEGRATION TESTS ===\n');

async function runTests() {
  // 1. Test getMlStatus
  console.log('Testing getMlStatus()...');
  const status = await getMlStatus();
  assert(status, 'ML status must return an object');
  assert.strictEqual(status.status, 'ok', 'Status must be ok');
  assert(status.svm_arm, 'Must include svm_arm');
  assert(status.roberta_arm, 'Must include roberta_arm');
  assert(status.dataset_statistics, 'Must include dataset_statistics');
  console.log('✔ Check 1: getMlStatus() returns valid ML subsystem status');

  // 2. Test classifyWithSvm on awaiting_data
  console.log('Testing classifyWithSvm()...');
  const svmRes = await classifyWithSvm('Could you please add dark mode?');
  assert(svmRes, 'SVM result must exist');
  assert.strictEqual(svmRes.status, 'awaiting_data', 'Un-trained SVM must return awaiting_data status');
  assert.strictEqual(svmRes.confidence, 0.0, 'Un-trained SVM confidence must be 0.0');
  console.log('✔ Check 2: classifyWithSvm() returns awaiting_data status when un-trained');

  // 3. Test classifyWithRoberta on awaiting_data
  console.log('Testing classifyWithRoberta()...');
  const robertaRes = await classifyWithRoberta('The battery drains very fast.');
  assert(robertaRes, 'RoBERTa result must exist');
  assert.strictEqual(robertaRes.status, 'awaiting_data', 'Un-trained RoBERTa must return awaiting_data');
  assert.strictEqual(robertaRes.confidence, 0.0, 'Un-trained RoBERTa confidence must be 0.0');
  console.log('✔ Check 3: classifyWithRoberta() returns awaiting_data status when un-trained');

  // 4. Test classifyAllModels
  console.log('Testing classifyAllModels()...');
  const allRes = await classifyAllModels('Please fix the sudden screen blackout.');
  assert(allRes.svm, 'Must contain svm output');
  assert(allRes.roberta, 'Must include roberta output');
  assert.strictEqual(allRes.svm.status, 'awaiting_data');
  assert.strictEqual(allRes.roberta.status, 'awaiting_data');
  console.log('✔ Check 4: classifyAllModels() correctly coordinates multi-model predictions');

  // 5. Test trainSvm rejection on insufficient dataset
  console.log('Testing trainSvm() on empty dataset...');
  const trainRes = await trainSvm();
  assert.strictEqual(trainRes.success, false, 'Training must fail when data is insufficient');
  assert.strictEqual(trainRes.status, 'insufficient_data', 'Status must be insufficient_data');
  assert(trainRes.message.includes('requires at least 4 adjudicated training examples'), 'Message must explain threshold');
  console.log('✔ Check 5: trainSvm() safely refuses training without sufficient adjudicated data');

  // 6. Test syncDatasetWithMl
  console.log('Testing syncDatasetWithMl()...');
  const sampleRecords = [
    {
      id: 'TEST_01',
      reviewId: 'REV_TEST_01',
      text: 'Sample explicit requirement',
      humanAnnotations: {
        annotatorA: 'EXPLICIT_NEED',
        annotatorB: 'EXPLICIT_NEED',
        adjudicated: 'EXPLICIT_NEED'
      }
    }
  ];
  const syncRes = await syncDatasetWithMl(sampleRecords);
  assert(syncRes.success, 'Sync must succeed');
  assert.strictEqual(syncRes.saved_records, 1, 'Saved records count must match');
  console.log('✔ Check 6: syncDatasetWithMl() synchronizes records to ML backend and updates split statistics');

  console.log('\nAll 6 Express ML Bridge Integration Tests Passed Successfully!\n');
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
