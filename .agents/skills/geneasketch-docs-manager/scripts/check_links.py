import os
import re

def check_links(directory, repo_root):
    md_files = [f for f in os.listdir(directory) if f.endswith('.md')]
    results = []
    for file in md_files:
        path = os.path.join(directory, file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all markdown links [text](path)
            links = re.findall(r'\[.*?\]\((.*?)\)', content)
            for link in links:
                if link.startswith('http') or link.startswith('#') or 'mailto' in link:
                    continue
                
                # Remove anchors
                link_path = link.split('#')[0]
                if not link_path:
                    continue
                
                # Resolve path
                if link_path.startswith('/'):
                    # Absolute from repo root
                    full_link_path = os.path.normpath(os.path.join(repo_root, link_path.lstrip('/')))
                else:
                    # Relative to current file
                    full_link_path = os.path.normpath(os.path.join(directory, link_path))
                
                if not os.path.exists(full_link_path):
                    results.append(f"Broken link in {file}: {link} -> {full_link_path}")
    return results

repo_root = r'c:\My_Projects\GeneaSketch'
wiki_gsk = os.path.join(repo_root, 'docs', 'wiki-gsk')
wiki_soft = os.path.join(repo_root, 'docs', 'wiki-software')
wiki_ux = os.path.join(repo_root, 'docs', 'wiki-uxdesign')

print(f"Checking links from repo root: {repo_root}")
print("Checking wiki-gsk...")
for error in check_links(wiki_gsk, repo_root):
    print(error)

print("\nChecking wiki-software...")
for error in check_links(wiki_soft, repo_root):
    print(error)

print("\nChecking wiki-uxdesign...")
for error in check_links(wiki_ux, repo_root):
    print(error)
