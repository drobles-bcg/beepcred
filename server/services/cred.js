const {
  User,
  LicensePlate,
  PlateImage,
  PlateVote,
  Comment,
  CommentVote,
  ImageVote,
} = require('../db');

async function recalcPlateVoteAggregates(plateId) {
  const rows = await PlateVote.findAll({
    where: { plate_id: plateId },
    attributes: ['vote'],
  });
  let plus = 0;
  let minus = 0;
  for (const r of rows) {
    if (r.vote === 1) plus += 1;
    else if (r.vote === -1) minus += 1;
  }
  await LicensePlate.update(
    { plus_count: plus, minus_count: minus, cred_score: plus - minus },
    { where: { id: plateId } }
  );
}

async function recalcCommentVoteAggregates(commentId) {
  const rows = await CommentVote.findAll({
    where: { comment_id: commentId },
    attributes: ['vote'],
  });
  let plus = 0;
  let minus = 0;
  for (const r of rows) {
    if (r.vote === 1) plus += 1;
    else if (r.vote === -1) minus += 1;
  }
  await Comment.update(
    { plus_count: plus, minus_count: minus, cred_score: plus - minus },
    { where: { id: commentId } }
  );
}

async function recalcImageVoteAggregates(imageId) {
  const rows = await ImageVote.findAll({
    where: { image_id: imageId },
    attributes: ['vote'],
  });
  let plus = 0;
  let minus = 0;
  for (const r of rows) {
    if (r.vote === 1) plus += 1;
    else if (r.vote === -1) minus += 1;
  }
  await PlateImage.update(
    { cred_score: plus - minus },
    { where: { id: imageId } }
  );
}

/**
 * User cred = sum of cred_score on their images + sum on their comments
 */
async function recalcUserCred(userId) {
  const [imgSum, comSum] = await Promise.all([
    PlateImage.sum('cred_score', { where: { uploaded_by: userId } }),
    Comment.sum('cred_score', { where: { user_id: userId, is_deleted: false } }),
  ]);
  const total = (imgSum || 0) + (comSum || 0);
  await User.update({ cred_score: total }, { where: { id: userId } });
}

module.exports = {
  recalcPlateVoteAggregates,
  recalcCommentVoteAggregates,
  recalcImageVoteAggregates,
  recalcUserCred,
};
