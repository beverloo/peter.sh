<?php
// Copyright 2014 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

class RssWriter {
    private $m_title;
    private $m_description;
    private $m_feedLink;
    private $m_link;
    private $m_articles;

    public function __construct() {
        $this->m_title = 'Untitled feed';
        $this->m_description = '';
        $this->m_feedLink = '';
        $this->m_link = 'https://peter.sh/';
        $this->m_articles = array();
    }

    public function setTitle($title) {
        $this->m_title = $title;
    }

    public function setDescription($description) {
        $this->m_description = $description;
    }

    public function setFeedLink($feedLink) {
        $this->m_feedLink = $feedLink;
    }

    public function setLink($link) {
        $this->m_link = $link;
    }

    public function addArticle($article) {
        if (!is_array($article))
            throw new Exception('Unable to generate RSS feed: invalid article supplied.');

        if (!array_key_exists('title', $article))
            $article['title'] = 'Untitled article';

        if (!array_key_exists('description', $article))
            $article['description'] = '';

        if (!array_key_exists('link', $article))
            $article['link'] = 'https://peter.sh/';

        if (!array_key_exists('date', $article))
            $article['date'] = time();

        $this->m_articles[] = $article;
    }

    private function quoteString($string) {
        return htmlentities($string, ENT_QUOTES);
    }

    public function render() {
        $latestArticleDate = strtotime('2014-10-16 00:00:00');
        usort($this->m_articles, function($lhs, $rhs) {
            return $lhs['date'] > $rhs['date'] ? -1 : 1;
        });

        if (count($this->m_articles))
            $latestArticleDate = $this->m_articles[0]['date'];

        Header('Content-Type: application/rss+xml');

        echo '<?xml version="1.0" encoding="UTF-8" ?>' . PHP_EOL;
        echo '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">' . PHP_EOL;
        echo '  <channel>' . PHP_EOL;
        echo '    <title>' . $this->quoteString($this->m_title) . '</title>' . PHP_EOL;
        echo '    <description>' . $this->quoteString($this->m_description) . '</description>' . PHP_EOL;
        echo '    <atom:link href="' . $this->quoteString($this->m_feedLink) . '" rel="self" type="application/rss+xml" />' . PHP_EOL;
        echo '    <link>' . $this->quoteString($this->m_link) . '</link>' . PHP_EOL;
        echo '    <lastBuildDate>' . date(DateTime::RSS, $latestArticleDate) . '</lastBuildDate>' . PHP_EOL;
        echo '    <pubDate>' . date(DateTime::RSS, $latestArticleDate) . '</pubDate>' . PHP_EOL;

        foreach ($this->m_articles as $article) {
            echo '    <item>' . PHP_EOL;
            echo '      <title>' . $this->quoteString($article['title']) . '</title>' . PHP_EOL;
            echo '      <description>' . $this->quoteString($article['description']) . '</description>' . PHP_EOL;
            echo '      <link>' . $this->quoteString($article['link']) . '</link>' . PHP_EOL;
            echo '      <guid>' . $this->quoteString($article['link']) . '</guid>' . PHP_EOL;
            echo '      <pubDate>' . date(DateTime::RSS, $article['date']) . '</pubDate>' . PHP_EOL;
            echo '    </item>' . PHP_EOL;
        }

        echo '  </channel>' . PHP_EOL;
        echo '</rss>';

        exit;
    }
};
