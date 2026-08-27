import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CareerDiscoveryStateError,
  createInMemoryDiscoveryStore,
  startOrResumeDiscoverySession,
  submitDiscoveryAnswer,
} from '../src/server/careerDiscoveryState';

const userId = '11111111-1111-4111-8111-111111111111';
const profileId = '22222222-2222-4222-8222-222222222222';

test('career discovery progresses deterministically without repeating completed questions', async () => {
  const store = createInMemoryDiscoveryStore();
  const initial = await startOrResumeDiscoverySession(store, {
    userId,
    profileId,
    branch: 'Computer Science Engineering',
    academicYear: 3,
  });

  assert.equal(initial.currentQuestion?.key, 'interests');

  const afterInterests = await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'interests',
    answer: 'full stack',
    clientMessageId: 'turn-1',
    stateVersion: initial.stateVersion,
    inputMode: 'voice',
  });

  assert.deepEqual(afterInterests.completedQuestionKeys, ['interests']);
  assert.equal(afterInterests.nextQuestion?.key, 'skills');

  const afterSkills = await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'skills',
    answer: 'React, APIs and SQL',
    clientMessageId: 'turn-2',
    stateVersion: afterInterests.stateVersion,
    inputMode: 'voice',
  });

  assert.deepEqual(afterSkills.completedQuestionKeys, ['interests', 'skills']);
  assert.equal(afterSkills.nextQuestion?.key, 'projects');
});

test('duplicate clientMessageId returns the same logical result without a second transition', async () => {
  const store = createInMemoryDiscoveryStore();
  const initial = await startOrResumeDiscoverySession(store, { userId, profileId, branch: 'CSE' });

  const first = await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'interests',
    answer: 'frontend',
    clientMessageId: 'same-turn',
    stateVersion: initial.stateVersion,
    inputMode: 'voice',
  });
  const duplicate = await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'interests',
    answer: 'frontend',
    clientMessageId: 'same-turn',
    stateVersion: initial.stateVersion,
    inputMode: 'voice',
  });

  assert.equal(first.stateVersion, duplicate.stateVersion);
  assert.equal(duplicate.nextQuestion?.key, 'skills');
  assert.equal(store.answers.length, 1);
  assert.equal(store.sessions[0].state_version, 2);
});

test('stale stateVersion is rejected with canonical current state', async () => {
  const store = createInMemoryDiscoveryStore();
  const initial = await startOrResumeDiscoverySession(store, { userId, profileId, branch: 'CSE' });
  const accepted = await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'interests',
    answer: 'backend',
    clientMessageId: 'turn-1',
    stateVersion: initial.stateVersion,
    inputMode: 'voice',
  });

  await assert.rejects(
    submitDiscoveryAnswer(store, {
      userId,
      discoverySessionId: initial.sessionId,
      questionKey: 'skills',
      answer: 'Node APIs',
      clientMessageId: 'turn-2',
      stateVersion: initial.stateVersion,
      inputMode: 'voice',
    }),
    (error) => {
      assert.ok(error instanceof CareerDiscoveryStateError);
      assert.equal(error.code, 'STALE_DISCOVERY_STATE');
      assert.equal(error.status, 409);
      assert.equal(error.session?.stateVersion, accepted.stateVersion);
      assert.equal(error.session?.currentQuestion?.key, 'skills');
      return true;
    },
  );
});

test('refresh resumes the active session from persisted answers', async () => {
  const store = createInMemoryDiscoveryStore();
  const initial = await startOrResumeDiscoverySession(store, { userId, profileId, branch: 'CSE' });
  const afterInterests = await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'interests',
    answer: 'full stack',
    clientMessageId: 'turn-1',
    stateVersion: initial.stateVersion,
    inputMode: 'voice',
  });
  await submitDiscoveryAnswer(store, {
    userId,
    discoverySessionId: initial.sessionId,
    questionKey: 'skills',
    answer: 'React, APIs and SQL',
    clientMessageId: 'turn-2',
    stateVersion: afterInterests.stateVersion,
    inputMode: 'voice',
  });

  const resumed = await startOrResumeDiscoverySession(store, { userId, profileId, branch: 'CSE' });

  assert.equal(resumed.sessionId, initial.sessionId);
  assert.deepEqual(resumed.completedQuestionKeys, ['interests', 'skills']);
  assert.equal(resumed.currentQuestion?.key, 'projects');
});

test('another authenticated user cannot submit to a discovery session', async () => {
  const store = createInMemoryDiscoveryStore();
  const initial = await startOrResumeDiscoverySession(store, { userId, profileId, branch: 'CSE' });

  await assert.rejects(
    submitDiscoveryAnswer(store, {
      userId: '33333333-3333-4333-8333-333333333333',
      discoverySessionId: initial.sessionId,
      questionKey: 'interests',
      answer: 'data',
      clientMessageId: 'turn-1',
      stateVersion: initial.stateVersion,
      inputMode: 'voice',
    }),
    (error) => error instanceof CareerDiscoveryStateError && error.code === 'SESSION_FORBIDDEN',
  );
});
