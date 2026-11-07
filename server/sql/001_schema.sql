-- Tumbuna Arts schema. Money is stored in toea (1 kina = 100 toea).
-- Arrays that are only ever read whole (crafts, tags, chapter lists) are JSON strings in TEXT.
-- Identifiers are unquoted, so Postgres stores them lowercase; db.ts restores the PascalCase in result rows.

CREATE TABLE Provinces (
  Slug      VARCHAR(60)  NOT NULL PRIMARY KEY,
  Name      VARCHAR(120) NOT NULL,
  Code      CHAR(3)       NOT NULL UNIQUE,
  Region    VARCHAR(20)  NOT NULL CHECK (Region IN ('Highlands', 'Momase', 'Southern', 'Islands')),
  Capital   VARCHAR(120) NOT NULL,
  Crafts    TEXT NOT NULL DEFAULT '[]',
  Blurb     VARCHAR(1000) NOT NULL,
  Pattern   VARCHAR(20)  NOT NULL
);

CREATE TABLE Categories (
  Slug    VARCHAR(60)  NOT NULL PRIMARY KEY,
  Name    VARCHAR(120) NOT NULL,
  Pattern VARCHAR(20)  NOT NULL,
  Variant INT NULL
);

CREATE TABLE Materials (
  Slug        VARCHAR(60)   NOT NULL PRIMARY KEY,
  Name        VARCHAR(120)  NOT NULL,
  Source      VARCHAR(1000) NOT NULL,
  Care        VARCHAR(1000) NOT NULL,
  ExportNote  VARCHAR(1000) NULL,
  Sustainable BOOLEAN NOT NULL,
  Pattern     VARCHAR(20)   NOT NULL
);

CREATE TABLE Techniques (
  Slug    VARCHAR(60)   NOT NULL PRIMARY KEY,
  Name    VARCHAR(120)  NOT NULL,
  "where" VARCHAR(300)  NOT NULL,
  Summary VARCHAR(2000) NOT NULL,
  Steps   TEXT  NOT NULL DEFAULT '[]',
  Tools   TEXT  NOT NULL DEFAULT '[]',
  Pattern VARCHAR(20)   NOT NULL
);

CREATE TABLE Stories (
  Slug         VARCHAR(100) NOT NULL PRIMARY KEY,
  Title        VARCHAR(200) NOT NULL,
  ProvinceSlug VARCHAR(60)  NOT NULL REFERENCES Provinces(Slug),
  CategorySlug VARCHAR(60)  NOT NULL REFERENCES Categories(Slug),
  Teller       VARCHAR(200) NOT NULL,
  ReadMins     INT NOT NULL,
  Pattern      VARCHAR(20)  NOT NULL,
  Variant      INT NULL,
  Intro        TEXT NOT NULL,
  Chapters     TEXT NOT NULL DEFAULT '[]',
  CreatedAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE Artists (
  Id                      VARCHAR(40)  NOT NULL PRIMARY KEY,
  Name                    VARCHAR(120) NOT NULL,
  ProvinceSlug            VARCHAR(60)  NOT NULL REFERENCES Provinces(Slug),
  Village                 VARCHAR(200) NOT NULL DEFAULT '',
  Crafts                  TEXT NOT NULL DEFAULT '[]',
  Bio                     TEXT NOT NULL DEFAULT '',
  Lineage                 TEXT NOT NULL DEFAULT '',
  YearsPractising         INT NOT NULL DEFAULT 0,
  Verification            VARCHAR(10)  NOT NULL DEFAULT 'none' CHECK (Verification IN ('none', 'pending', 'verified')),
  VerificationSubmittedAt TIMESTAMPTZ NULL,
  Pattern                 VARCHAR(20)  NOT NULL DEFAULT 'carve',
  Variant                 INT NULL,
  AvatarUrl               VARCHAR(500) NULL,
  JoinedAt                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE Users (
  Id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  Name         VARCHAR(120) NOT NULL,
  Email        VARCHAR(254) NULL,
  Phone        VARCHAR(30)  NULL,
  PasswordHash VARCHAR(100) NOT NULL,
  Role         VARCHAR(10)  NOT NULL CHECK (Role IN ('buyer', 'artist', 'admin')),
  ArtistId     VARCHAR(40)  NULL REFERENCES Artists(Id),
  Country      VARCHAR(80)  NOT NULL,
  City         VARCHAR(120) NULL,
  CreatedAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX UX_Users_Email ON Users(Email) WHERE Email IS NOT NULL;
CREATE UNIQUE INDEX UX_Users_Phone ON Users(Phone) WHERE Phone IS NOT NULL;
CREATE UNIQUE INDEX UX_Users_Artist ON Users(ArtistId) WHERE ArtistId IS NOT NULL;

CREATE TABLE Artworks (
  Id            VARCHAR(40)  NOT NULL PRIMARY KEY,
  ArtistId      VARCHAR(40)  NOT NULL REFERENCES Artists(Id),
  Title         VARCHAR(200) NOT NULL,
  CategorySlug  VARCHAR(60)  NOT NULL REFERENCES Categories(Slug),
  ProvinceSlug  VARCHAR(60)  NOT NULL REFERENCES Provinces(Slug),
  PriceToea     INT NOT NULL CHECK (PriceToea >= 0),
  Pattern       VARCHAR(20)  NOT NULL,
  Variant       INT NULL,
  Story         TEXT NOT NULL DEFAULT '',
  Significance  TEXT NOT NULL DEFAULT '',
  Dimensions    VARCHAR(100) NOT NULL DEFAULT '',
  WeightKg      NUMERIC(7, 2) NOT NULL DEFAULT 1,
  ExportPermit  BOOLEAN NOT NULL DEFAULT false,
  OneOfAKind    BOOLEAN NOT NULL DEFAULT true,
  Status        VARCHAR(10)  NOT NULL DEFAULT 'draft' CHECK (Status IN ('live', 'draft', 'sold', 'hidden')),
  Featured      BOOLEAN NOT NULL DEFAULT false,
  Views         INT NOT NULL DEFAULT 0,
  CreatedAt     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UpdatedAt     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IX_Artworks_Status ON Artworks(Status, CreatedAt DESC) INCLUDE (CategorySlug, ProvinceSlug, PriceToea, ArtistId);
CREATE INDEX IX_Artworks_Artist ON Artworks(ArtistId, Status);

CREATE TABLE ArtworkMedia (
  Id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ArtworkId VARCHAR(40)  NOT NULL REFERENCES Artworks(Id) ON DELETE CASCADE,
  Url       VARCHAR(500) NOT NULL,
  SortOrder INT NOT NULL
);
CREATE INDEX IX_ArtworkMedia_Artwork ON ArtworkMedia(ArtworkId, SortOrder);

CREATE TABLE ArtworkMaterials (
  ArtworkId    VARCHAR(40) NOT NULL REFERENCES Artworks(Id) ON DELETE CASCADE,
  MaterialSlug VARCHAR(60) NOT NULL REFERENCES Materials(Slug),
  PRIMARY KEY (ArtworkId, MaterialSlug)
);

CREATE TABLE ArtworkTechniques (
  ArtworkId     VARCHAR(40) NOT NULL REFERENCES Artworks(Id) ON DELETE CASCADE,
  TechniqueSlug VARCHAR(60) NOT NULL REFERENCES Techniques(Slug),
  PRIMARY KEY (ArtworkId, TechniqueSlug)
);

-- One certificate per artwork, issued when the artwork is created.
CREATE TABLE Certificates (
  Serial      VARCHAR(40)  NOT NULL PRIMARY KEY,
  ArtworkId   VARCHAR(40)  NOT NULL UNIQUE REFERENCES Artworks(Id) ON DELETE CASCADE,
  Fingerprint CHAR(64)      NOT NULL,
  IssuedAt    TIMESTAMPTZ NOT NULL DEFAULT now(),
  OwnerUserId VARCHAR(40)  NULL REFERENCES Users(Id),
  OwnerName   VARCHAR(120) NULL -- for owners without an account (e.g. imported sales)
);

CREATE TABLE CertificateTransfers (
  Id         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  Serial     VARCHAR(40) NOT NULL REFERENCES Certificates(Serial) ON DELETE CASCADE,
  FromUserId VARCHAR(40) NULL,
  ToUserId   VARCHAR(40) NOT NULL,
  Reason     VARCHAR(20) NOT NULL CHECK (Reason IN ('purchase', 'transfer')),
  CreatedAt  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE Addresses (
  Id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  UserId    VARCHAR(40)  NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  Name      VARCHAR(120) NOT NULL,
  Phone     VARCHAR(30)  NOT NULL,
  Line1     VARCHAR(200) NOT NULL,
  City      VARCHAR(120) NOT NULL,
  Province  VARCHAR(120) NOT NULL,
  Country   VARCHAR(80)  NOT NULL,
  Postcode  VARCHAR(20)  NOT NULL DEFAULT '',
  UpdatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One order per artist; orders from the same checkout share CheckoutId.
CREATE TABLE Orders (
  Id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  Number         VARCHAR(20)  NOT NULL UNIQUE,
  CheckoutId     UUID NOT NULL,
  BuyerId        VARCHAR(40)  NULL REFERENCES Users(Id),
  BuyerName      VARCHAR(120) NOT NULL,
  ArtistId       VARCHAR(40)  NOT NULL REFERENCES Artists(Id),
  ShipName       VARCHAR(120) NOT NULL,
  ShipPhone      VARCHAR(30)  NOT NULL,
  ShipLine1      VARCHAR(200) NOT NULL,
  ShipCity       VARCHAR(120) NOT NULL,
  ShipProvince   VARCHAR(120) NOT NULL,
  ShipCountry    VARCHAR(80)  NOT NULL,
  ShipPostcode   VARCHAR(20)  NOT NULL DEFAULT '',
  ShippingId     VARCHAR(20)  NOT NULL,
  ShippingLabel  VARCHAR(80)  NOT NULL,
  Carrier        VARCHAR(40)  NOT NULL,
  ShippingToea   INT NOT NULL,
  Eta            VARCHAR(40)  NOT NULL,
  PermitFeeToea  INT NOT NULL DEFAULT 0,
  SubtotalToea   INT NOT NULL,
  TotalToea      INT NOT NULL,
  Payment        VARCHAR(60)  NOT NULL,
  PaymentRef     VARCHAR(80)  NULL,
  Status         VARCHAR(10)  NOT NULL CHECK (Status IN ('placed', 'packed', 'shipped', 'delivered', 'cancelled')),
  TrackingNo     VARCHAR(60)  NULL,
  Reviewed       BOOLEAN NOT NULL DEFAULT false,
  Sample         BOOLEAN NOT NULL DEFAULT false,
  CreatedAt      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ConfirmedAt    TIMESTAMPTZ NULL
);
CREATE INDEX IX_Orders_Buyer ON Orders(BuyerId, CreatedAt DESC);
CREATE INDEX IX_Orders_Artist ON Orders(ArtistId, CreatedAt DESC);

CREATE TABLE OrderItems (
  OrderId   VARCHAR(40) NOT NULL REFERENCES Orders(Id) ON DELETE CASCADE,
  ArtworkId VARCHAR(40) NOT NULL REFERENCES Artworks(Id),
  PriceToea INT NOT NULL,
  PRIMARY KEY (OrderId, ArtworkId)
);

CREATE TABLE OrderEvents (
  Id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  OrderId   VARCHAR(40)  NOT NULL REFERENCES Orders(Id) ON DELETE CASCADE,
  Status    VARCHAR(10)  NOT NULL,
  Note      VARCHAR(300) NULL,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IX_OrderEvents_Order ON OrderEvents(OrderId, CreatedAt);

CREATE TABLE Reviews (
  Id        VARCHAR(40)  NOT NULL PRIMARY KEY,
  ArtworkId VARCHAR(40)  NOT NULL REFERENCES Artworks(Id),
  ArtistId  VARCHAR(40)  NOT NULL REFERENCES Artists(Id),
  OrderId   VARCHAR(40)  NULL REFERENCES Orders(Id),
  UserId    VARCHAR(40)  NULL REFERENCES Users(Id),
  UserName  VARCHAR(120) NOT NULL,
  Rating    SMALLINT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
  Tags      TEXT NOT NULL DEFAULT '[]',
  Text      VARCHAR(2000) NOT NULL DEFAULT '',
  Photos    TEXT NOT NULL DEFAULT '[]',
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX UX_Reviews_Order ON Reviews(OrderId) WHERE OrderId IS NOT NULL;
CREATE INDEX IX_Reviews_Artist ON Reviews(ArtistId, CreatedAt DESC);

CREATE TABLE Wishlist (
  UserId    VARCHAR(40) NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  ArtworkId VARCHAR(40) NOT NULL REFERENCES Artworks(Id) ON DELETE CASCADE,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (UserId, ArtworkId)
);

CREATE TABLE Follows (
  UserId    VARCHAR(40) NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  ArtistId  VARCHAR(40) NOT NULL REFERENCES Artists(Id),
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (UserId, ArtistId)
);

CREATE TABLE Payouts (
  Id         VARCHAR(40) NOT NULL PRIMARY KEY,
  ArtistId   VARCHAR(40) NOT NULL REFERENCES Artists(Id),
  AmountToea INT NOT NULL CHECK (AmountToea > 0),
  Method     VARCHAR(60) NOT NULL,
  Status     VARCHAR(12) NOT NULL DEFAULT 'requested' CHECK (Status IN ('requested', 'paid', 'failed')),
  CreatedAt  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE Notifications (
  Id        VARCHAR(40)  NOT NULL PRIMARY KEY,
  UserId    VARCHAR(40)  NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  Kind      VARCHAR(10)  NOT NULL CHECK (Kind IN ('order', 'activity', 'verify', 'payout')),
  Title     VARCHAR(200) NOT NULL,
  Body      VARCHAR(500) NOT NULL,
  Link      VARCHAR(200) NULL,
  IsRead    BOOLEAN NOT NULL DEFAULT false,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IX_Notifications_User ON Notifications(UserId, CreatedAt DESC);

CREATE TABLE PasswordResets (
  Id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  UserId    VARCHAR(40)  NOT NULL REFERENCES Users(Id) ON DELETE CASCADE,
  CodeHash  VARCHAR(100) NOT NULL,
  Attempts  INT NOT NULL DEFAULT 0,
  ExpiresAt TIMESTAMPTZ NOT NULL,
  UsedAt    TIMESTAMPTZ NULL,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE VerificationRequests (
  Id           VARCHAR(40)  NOT NULL PRIMARY KEY,
  ArtistId     VARCHAR(40)  NOT NULL REFERENCES Artists(Id),
  IdPhotoUrl   VARCHAR(500) NOT NULL,
  SelfieUrl    VARCHAR(500) NOT NULL,
  RefereeName  VARCHAR(120) NOT NULL,
  RefereeRole  VARCHAR(120) NOT NULL DEFAULT '',
  RefereePhone VARCHAR(30)  NOT NULL,
  Portfolio    TEXT NOT NULL DEFAULT '[]',
  Status       VARCHAR(10)  NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'approved', 'rejected')),
  ReviewNote   VARCHAR(500) NULL,
  ReviewedBy   VARCHAR(40)  NULL REFERENCES Users(Id),
  ReviewedAt   TIMESTAMPTZ NULL,
  CreatedAt    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IX_Verification_Status ON VerificationRequests(Status, CreatedAt);

CREATE TABLE CommissionRequests (
  Id         VARCHAR(40)   NOT NULL PRIMARY KEY,
  ArtistId   VARCHAR(40)   NOT NULL REFERENCES Artists(Id),
  UserId     VARCHAR(40)   NOT NULL REFERENCES Users(Id),
  Brief      VARCHAR(2000) NOT NULL,
  BudgetToea INT NULL,
  Status     VARCHAR(10)   NOT NULL DEFAULT 'open' CHECK (Status IN ('open', 'quoted', 'declined', 'closed')),
  CreatedAt  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE SupportMessages (
  Id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  UserId    VARCHAR(40)   NULL REFERENCES Users(Id),
  Message   VARCHAR(2000) NOT NULL,
  Context   VARCHAR(200)  NULL,
  CreatedAt TIMESTAMPTZ NOT NULL DEFAULT now()
);
