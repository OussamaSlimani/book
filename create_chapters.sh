#!/bin/bash

# Input file
INPUT_FILE="book.txt"

# Delimiter
DELIM="##################"

# Read the first three metadata blocks
title=$(awk -v RS="$DELIM" 'NR==1 { gsub(/\n/, "", $0); print $0 }' "$INPUT_FILE")
id=$(awk -v RS="$DELIM" 'NR==2 { gsub(/\n/, "", $0); print $0 }' "$INPUT_FILE")
chapter_count=$(awk -v RS="$DELIM" 'NR==3 { gsub(/\n/, "", $0); print $0 }' "$INPUT_FILE")

# Output folder
OUT_DIR="books/$id"
mkdir -p "$OUT_DIR"

# Get all chapter contents
chapter_contents=()
index=0
while IFS= read -r -d '' chapter; do
    chapter_contents+=("$chapter")
    ((index++))
done < <(awk -v RS="$DELIM" 'NR>3 { print $0 "\0" }' "$INPUT_FILE")

# Create chapter HTML files
for i in "${!chapter_contents[@]}"; do
    chapter_num=$((i + 1))
    file_name=$(printf "%s_%02d.html" "$id" "$chapter_num")
    file_path="$OUT_DIR/$file_name"

    # Escape HTML special characters
    content=$(echo "${chapter_contents[$i]}" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')

    # Start HTML file
    cat <<EOF > "$file_path"
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>$title - Chapter $chapter_num</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Fauna+One&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../css/book.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>

<body class="dark-mode">
  <button class="mobile-menu-toggle" id="mobileMenuToggle">
    <i class="fas fa-bars"></i>
  </button>

  <div class="main-container">
    <nav class="nav-sidebar">
      <h2>Chapters</h2>
      <ul class="chapter-list" id="chapterList">
EOF

    # Chapter navigation list
    for ((j = 1; j <= chapter_count; j++)); do
        ch_file=$(printf "%s_%02d.html" "$id" "$j")
        active_class=""
        [[ $j -eq $chapter_num ]] && active_class=' class="active"'
        echo "        <li><a href=\"$ch_file\"$active_class>Chapter $j</a></li>" >> "$file_path"
    done

    # Continue with content section
    cat <<EOF >> "$file_path"
      </ul>
    </nav>

    <div class="content-area">
      <div class="quick-controls">
        <button id="homeButton" title="Go to home"><i class="fas fa-home"></i></button>
        <button id="goToSavedBtn" title="Go to saved word"><i class="fas fa-bookmark"></i></button>
        <button id="timerButton" title="Reading timer"><i class="fas fa-play"></i></button>
        <span id="timerDisplay">00:00</span>
      </div>

      <div class="book-container" id="bookContainer" style="display: block;">
        <h1 id="bookTitle">$title</h1>
        <h2>Chapter $chapter_num</h2>
        <div id="bookContent">
EOF

    # Output chapter content with paragraphs
    echo "$content" | awk -v id="$id" -v ch="$chapter_num" '
    BEGIN { RS=""; ORS="\n\n" }
    {
        gsub(/\n+/, " ");
        printf "          <p>"
        split($0, words, " ")
        for (i = 1; i <= length(words); i++) {
            if (words[i] != "") {
                printf "<span class=\"word\" id=\"%s_%d_%d\">%s</span> ", id, ch, i, words[i]
            }
        }
        print "</p>\n"
    }' >> "$file_path"

    # Close HTML
    cat <<EOF >> "$file_path"
        </div>
      </div>

      <div id="phraseTranslation" class="phrase-translation"></div>
      <div id="loadingIndicator" class="loading-indicator">Translating...</div>
    </div>
  </div>

  <script src="../../js/script.js"></script>
</body>
</html>
EOF

    echo "✅ Chapter $chapter_num: $file_path"
done
