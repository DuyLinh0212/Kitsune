# DevLearningHub UI/UX Specification for Claude

## Skills to use before implementation

-   filesystem-context
-   memory-systems
-   tool-design
-   context-compression
-   context-optimization
-   frontend-design

------------------------------------------------------------------------

# Phase 1 - Global Layout & Navigation

## Sidebar Navigation

-   Từ Vựng
-   Kanji
    -   Only visible when learning Japanese.
    -   Hidden when learning English.
-   Quiz
-   Bài Viết
-   Ôn Tập
-   Gửi Phản Hồi

## Header Layout

### Left

-   Kitsune Logo

### Center

-   Search bar (only on Dashboard/Home)

### Right

-   Notification Bell icon
-   User Avatar
-   Expand/Collapse arrow for user menu

## Behavior Rules

-   When opening Vocabulary, Quiz, Articles, Review or any other sidebar
    page:
    -   Hide global search bar.
-   Search bar only appears on Dashboard/Home page.

------------------------------------------------------------------------

# Phase 2 - User Profile System

## Dropdown Menu

Clicking arrow beside avatar opens: - Cài đặt - Thông tin cá nhân - Đăng
xuất

## Profile Page

### Basic Information

-   Avatar
-   Full name below avatar

### Learning Statistics

-   Folder statistics
-   View all folders button
-   Number of quizzes completed
-   Number of quizzes created
-   Number of SRS vocabulary learned

------------------------------------------------------------------------

# Phase 3 - Dashboard

Dashboard implementation postponed for future phase.

------------------------------------------------------------------------

# Phase 4 - Vocabulary Module

## Vocabulary List

-   Display vocabulary cards in clean grid layout.
-   Vocabulary displayed randomly.
-   Clicking a vocabulary opens detail panel.

## Search System

Search supported by: - Hiragana - Katakana - Kanji - Vietnamese

## Search Result Layout

### Left Panel

-   Related vocabulary list based on keyword.

### Right Panel

Selected vocabulary displays: - Meaning - Sino-Vietnamese reading -
Kanji composition breakdown - Explanation of which Kanji forms the word

## Folder Management

Vocabulary detail contains: - Add to Folder button - Existing folder
selection - Create new folder directly

## SRS Integration

Buttons: - Add to Review (SRS) - Add to Favorite Vocabulary
(VocabularyBookmark)

------------------------------------------------------------------------

# Phase 5 - Future Features

## Dashboard widgets

-   Learning streak
-   Daily goals
-   Recommended vocabulary
-   Recently viewed vocabulary

## Notification center

-   Quiz reminders
-   SRS reminders
-   System announcements

## Personalization

-   Theme settings
-   Language preferences
-   Study preferences

------------------------------------------------------------------------

# Suggested Component Structure

## Layout Components

-   MainLayout
-   Sidebar
-   Header
-   NotificationDropdown
-   UserDropdown

## Vocabulary Components

-   VocabularyGrid
-   VocabularyCard
-   VocabularySearch
-   VocabularyDetail
-   FolderSelector
-   SRSActionButtons

## Profile Components

-   ProfileHeader
-   StatisticsSection
-   FolderStatistics
-   QuizStatistics
-   SRSStatistics
