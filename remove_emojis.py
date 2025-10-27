import re

with open('index.html', 'r') as f:
    content = f.read()

# Remove emojis
content = re.sub(r'[🔓✏️🔑✅❌👤👨👩🧑👦👧🧒👴👵🦸💾⚡⚙️🚪🏠⚙️🔐👤💬🎯🔔📜🔁🔄👥💬🎯🔐📝✅🔍📊📈🤔💡🌟]/g', '', content)
content = re.sub(r'[🔒📧✅💬🔐🎯🧑\u2022]/g', '', content)

with open('index.html', 'w') as f:
    f.write(content)

print("Emojis removed")
