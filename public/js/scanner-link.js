// scanner-link.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('Scanner link integration loaded');
    
    setTimeout(replaceTransactionButtons, 1000);
  });
  

  function replaceTransactionButtons() {
    console.log('Replacing transaction buttons with scanner links');
    
    document.querySelectorAll('.transaction-btn').forEach(btn => {
      const itemId = btn.dataset.id;
      const itemName = btn.dataset.name;
      
      if (!itemId) {
        console.warn('Transaction button missing item ID');
        return;
      }
  
      const link = document.createElement('a');
      link.href = `scanner.html?id=${itemId}`;
      link.className = 'btn btn-sm btn-outline-success';
      link.innerHTML = '<i class="fas fa-exchange-alt"></i>';
      link.title = `Process ${itemName || 'item'} on Scanner Page`;
      
  
      if (btn.parentNode) {
        btn.parentNode.replaceChild(link, btn);
      }
    });
    
    console.log('Transaction buttons replaced');
  }