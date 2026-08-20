import client from './client';

export const getPolls = () => client('/polls');

export const voteInPoll = (pollId, option) => 
  client(`/polls/${pollId}/vote`, {
    method: 'POST',
    body: { option },
  });

export const createPoll = (question, options) =>
  client('/polls', {
    method: 'POST',
    body: { question, options },
  });

export const togglePollStatus = (pollId) =>
  client(`/polls/${pollId}/toggle`, {
    method: 'PUT',
  });

export const deletePoll = (pollId) =>
  client(`/polls/${pollId}`, {
    method: 'DELETE',
  });

export default {
  getPolls,
  voteInPoll,
  createPoll,
  togglePollStatus,
  deletePoll,
};
