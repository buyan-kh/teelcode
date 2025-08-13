import json
import requests
import time

def get_problem_topics_graphql(title_slug):
    url = "https://leetcode.com/graphql"
    
    query = """
    query getQuestionDetail($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            topicTags {
                name
                slug
            }
        }
    }
    """
    
    payload = {
        "query": query,
        "variables": {"titleSlug": title_slug}
    }
    
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        data = response.json()
        
        if 'data' in data and data['data']['question']:
            topics = [tag['name'] for tag in data['data']['question']['topicTags']]
            return topics
        return []
    except Exception as e:
        print(f"Error fetching topics for {title_slug}: {e}")
        return []

def update_problems_with_topics(json_file_path):
    with open(json_file_path, 'r', encoding='utf-8') as f:
        problems = json.load(f)
    print(f"Loaded {len(problems)} problems")
    
    for i, problem in enumerate(problems):
        print(f"Processing {i+1}/{len(problems)}: {problem['TitleSlug']}")
        
        topics = get_problem_topics_graphql(problem['TitleSlug'])
        
        problem['Topics'] = topics
        
        print(f"  Added topics: {topics}")
    
    with open('problems_with_topics.json', 'w', encoding='utf-8') as f:
        json.dump(problems, f, ensure_ascii=False, indent=2)
    
    print("Done! Updated problems saved to 'problems_with_topics.json'")

update_problems_with_topics('data.json')
