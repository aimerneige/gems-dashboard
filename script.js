document.addEventListener('DOMContentLoaded', () => {
    const gemContainer = document.getElementById('gem-container');

    fetch('bookmarks.yaml')
        .then(response => response.text())
        .then(yamlText => {
            const gems = jsyaml.load(yamlText);
            gems.forEach(gem => {
                const card = document.createElement('a');
                card.href = gem.url;
                card.className = 'gem-card';
                card.target = '_blank'; // Open in new tab

                const icon = document.createElement('img');
                icon.src = gem.icon || 'https://via.placeholder.com/100';
                icon.className = 'gem-icon';

                const title = document.createElement('h2');
                title.textContent = gem.name;

                const description = document.createElement('p');
                description.textContent = gem.description;

                card.appendChild(icon);
                card.appendChild(title);
                card.appendChild(description);
                gemContainer.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error loading or parsing YAML:', error);
            gemContainer.textContent = 'Failed to load GEMs.';
        });
});
