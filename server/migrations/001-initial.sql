--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE css_selector
(
    name       VARCHAR PRIMARY KEY NOT NULL,
    created_at DATE NOT NULL,
    seen_at    DATE
--     first_seen_at DATE,
--     last_seen_at  DATE
);

CREATE TABLE css_file
(
    name       VARCHAR PRIMARY KEY NOT NULL,
    created_at DATE NOT NULL,
    seen_at    DATE
);

CREATE TABLE file_selector
(
    selector VARCHAR NOT NULL,
    file     VARCHAR NOT NULL,
    PRIMARY KEY (selector, file)
);

CREATE TABLE css_file_history
(
    pattern VARCHAR NOT NULL,
    url VARCHAR PRIMARY KEY NOT NULL,
    created_at DATE NOT NULL
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE selector;
DROP TABLE css_file;
DROP TABLE file_selector;
DROP TABLE css_file_history;