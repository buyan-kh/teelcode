import json

def print_all_unique_topics(json_file_path):
    """Print all unique topics from the problems data"""
    with open('data1.json', 'r', encoding='utf-8') as f:
        problems = json.load(f)
    
    # Use a set to automatically handle duplicates
    all_topics = set()
    
    for problem in problems:
        # Check if the problem has topics (could be 'Topics' or 'topics')
        topics = problem.get('Topics', []) or problem.get('topics', [])
        if topics:
            all_topics.update(topics)
    
    # Convert to sorted list for better readability
    sorted_topics = sorted(all_topics)
    
    print(f"Total unique topics: {len(all_topics)}")
    print("\nAll unique topics:")
    for topic in sorted_topics:
        print(topic)
    
    return all_topics

# Run it
print_all_unique_topics('data.json')