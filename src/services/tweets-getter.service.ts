import { Scraper, Tweet } from "@the-convocation/twitter-scraper";
import ora from "ora";

import { API_RATE_LIMIT, TWITTER_HANDLE } from "../constants";
import { getCachedPosts } from "../helpers/cache/get-cached-posts";
import { oraPrefixer, oraProgress } from "../helpers/logs";
import { isTweetCached, tweetFormatter } from "../helpers/tweet";
import { getEligibleTweet } from "../helpers/tweet/get-eligible-tweet";

const pullContentStats = (tweets: Tweet[], title: string) => {
  const stats = {
    total: tweets.length,
    retweets: tweets.filter((t) => t.isRetweet).length,
    replies: tweets.filter((t) => t.isReply).length,
    quotes: tweets.filter((t) => t.isQuoted).length,
  };

  return (
    `${title}:` +
    Object.entries(stats).reduce(
      (s, [name, value]) => `${s} ${name}: ${value}`,
      "",
    )
  );
};

export const tweetsGetterService = async (
  twitterClient: Scraper,
): Promise<Tweet[]> => {
  const cachedPosts = await getCachedPosts();
  const log = ora({
    color: "cyan",
    prefixText: oraPrefixer("content-mapper"),
  }).start();
  log.text = "filtering";

  let preventPostsSynchronization = false;
  const LATEST_TWEETS_COUNT = 5;

  /**
   * Synchronization optimization: prevent excessive API calls & potential rate-limiting
   *
   * Pull the ${LATEST_TWEETS_COUNT}, filter eligible ones.
   * This optimization prevents the post sync if the latest eligible tweet is cached.
   */
  const latestTweets = twitterClient.getTweets(
    TWITTER_HANDLE,
    LATEST_TWEETS_COUNT,
  );

  // TEMP to handle issue where tweet scraper is including pinned tweets
  /////////////////////////////////
  // problem: preventPostsSynchronization logic is added with the assumption
  // that if <current post> has already been posted, then every post after it
  // has probably been synced too. However currently twitter-scraper includes
  // the pinned tweet as the first tweet, so if the pinned tweet isn't the
  // latest then all the actual posts that should be synced are skipped!!
  // so this constant tells the loop to not set `preventPostsSynchronization`
  // to `true` if it's pinned!
  // @see https://github.com/the-convocation/twitter-scraper/issues/164
  let isFirstTweet = true;

  for await (const latestTweet of latestTweets) {
    log.text = "post: → checking for synchronization needs";
    if (!preventPostsSynchronization) {
      // Only consider eligible tweets.
      const tweet = await getEligibleTweet(tweetFormatter(latestTweet));

      if (tweet) {
        // If the latest eligible tweet is cached, mark sync as unneeded.
        if (!isFirstTweet && isTweetCached(tweet, cachedPosts)) {
          preventPostsSynchronization = true;
        }
        // If the latest tweet is not cached,
        // skip the current optimization and go to synchronization step.
        break;
      }

      isFirstTweet = false;
    }
  }

  // Get tweets from API
  const tweets: Tweet[] = [];

  if (preventPostsSynchronization) {
    log.succeed("task finished (unneeded sync)");
  } else {
    const tweetsIds = twitterClient.getTweets(TWITTER_HANDLE, 200);

    let hasRateLimitReached = false;
    let tweetIndex = 0;
    for await (const tweet of tweetsIds) {
      tweetIndex++;
      oraProgress(log, { before: "post: → filtering" }, tweetIndex, 200);

      const rateLimitTimeout = setTimeout(
        () => (hasRateLimitReached = true),
        1000 * API_RATE_LIMIT,
      );

      if (hasRateLimitReached || isTweetCached(tweet, cachedPosts)) {
        continue;
      }

      const t: Tweet = tweetFormatter(tweet);

      const eligibleTweet = await getEligibleTweet(t);
      if (eligibleTweet) {
        tweets.unshift(eligibleTweet);
      }
      clearTimeout(rateLimitTimeout);
    }

    if (hasRateLimitReached) {
      log.warn(
        `rate limit reached, more than ${API_RATE_LIMIT}s to fetch a single tweet`,
      );
    }

    log.succeed(pullContentStats(tweets, "tweets"));
    log.succeed("task finished");
  }

  return tweets;
};
