{% if section.settings.cart-offer-product != blank %}
  const FREE_PRODUCT_VARIANT_ID = {{ section.settings.cart-offer-product.selected_or_first_available_variant.id }};  // can be customized if a specific variant is the free product
{% endif %}
  const FREE_ITEM_EXTRA_TITLE = "(On All Orders Above {{ section.settings.cart-offer-price }}!)";
  const NO_IMAGE_URL = "{{ 'no-image.jpg' | asset_url }}";
  const LOADING_ICON_URL = "{{ 'loading-spinner.svg' | asset_url }}";
  const FIX_DECIMALS = 0;

  function rtToggleCart(e) {
    // Open cart when it is closed
  	if ($('.rt-custom-cart-container').css('right') == '-1000px') {
      $('html').addClass('rt-no-scroll');
      $('body').addClass('rt-no-scroll');
      $('.rt-custom-cart-container').css('right', '0');
      $('.rt-custom-cart-overlay').css('display', 'block');
    } else {  // Close cart when it is open
      $('html').removeClass('rt-no-scroll');
      $('body').removeClass('rt-no-scroll');
      $('.rt-custom-cart-container').css('right', '-1000px');
      $('.rt-custom-cart-overlay').css('display', 'none');
    }
  }
 
  function rtGetImageSrc(imageUrl) {
    if (imageUrl.includes('.jpg')) {
      return imageUrl.split('.jpg')[0] + "_100x" + '.jpg' + imageUrl.split('.jpg')[1];
    } else if (imageUrl.includes('.png')){
      return imageUrl.split('.png')[0] + "_100x" + '.png' + imageUrl.split('.png')[1];
    }
    return imageUrl;
  }

  function rtPopulateAddons(cart) {
  {% if section.settings.addons-enabled == false %}
    $(".rt-addon-container").css("display", "none");
  {% else %}
    let lastProductId = 0;
    if (cart.items.length > 0 && cart.items[cart.items.length - 1]) {
      lastProductId = cart.items[cart.items.length - 1].product_id;
    } else {
      lastProductId = {{ product.id }};
    }
    $.getJSON('/recommendations/products.json?product_id=' + lastProductId, function(response) {
      if (!response.products.length) return;  // response is faulty
      $('.rt-addon-product-container').empty();

      for (const recommendedItem of response.products) {
        if ($('.rt-addon-product').length == 3) {  // 3 recommendations maximum
          break;
        }
        if (!recommendedItem.available) continue;
      {% if section.settings.cart-offer-product != blank %}
        if (recommendedItem.id == {{ section.settings.cart-offer-product.id }}) continue;
      {% endif %}

        let onlyDefaultVariant = false
        if (recommendedItem.options.length == 1 && recommendedItem.options[0].name == "Title" && recommendedItem.options[0].values[0] == "Default Title") {
          onlyDefaultVariant = true;
        }

        if (recommendedItem.options.length == 1 && cart.items.some(item => item.product_id == recommendedItem.id)) continue;  // if product has only one variant and it's already in cart, don't show it in addons

        let itemUrl = `/products/${recommendedItem.handle}`;
        let imageSrc = NO_IMAGE_URL;
        if (recommendedItem.images.length) {
          imageSrc = rtGetImageSrc(recommendedItem.images[0]);
        } 

        let optionHtml = "";  
        for (const eachOption of recommendedItem.options) {
          let optionValuesHtml = "";
          for (const eachValue of eachOption.values) {
            optionValuesHtml += `<option>${eachValue}</option>`;
          }
          optionHtml += 
            `<div class="rt-addon-product-option-container">
              <label class="rt-ccap-option-label">${eachOption.name} - </label>
              <select class="rt-ccap-option" data-product-option="${eachOption.position}">
                ${optionValuesHtml}
              </select>
            </div>`;
        }

        $('.rt-addon-product-container').append(
          `<div class="rt-addon-product">
            <div class="rt-addon-product-top">
              <a href="${itemUrl}"> 
                <img class="rt-addon-product-image" src="${imageSrc}" alt="caption_img"> 
              </a> 
              <div class="rt-header-price-container"> 
                <a href="${itemUrl}">  
                  <h4 class="rt-addon-product-title">${recommendedItem.title}</h4> 
                </a> 
                <a href="${itemUrl}"> 
                  <h4 class="rt-addon-product-price"><span class="money" data-currency="USD">$${(recommendedItem.price / 100).toFixed(FIX_DECIMALS)}</span></h4> 
                </a> 
              </div> 
              <a class="rt-addon-product-button-container" href="#"> 
                <button class="rt-addon-product-button ${onlyDefaultVariant ? "rt-add-addon-product only-default" : ""}" data-product-url="${itemUrl}" data-product-handle="${recommendedItem.handle}" data-variant-id="${recommendedItem.id}">
                  ${onlyDefaultVariant ? "Add product" : "Options"}
                </button>
              </a>
            </div> 
            <div class="rt-addon-product-bottom">
              ${optionHtml}
            </div>
            <p class="rt-out-of-stock-error"</p>
          </div>`);
      }
    });
  {% endif %}
  }

  async function rtAddAddonProduct(productUrl, optionsMappedByPosition) {
    let variantId = "";
    if (productUrl) {
      await $.getJSON(productUrl, function(productData) {
        for (const eachVariant of productData.product.variants) {
          let isVariantFound = false;
          for (const [optionPosition, optionValue] of optionsMappedByPosition) {
            if (eachVariant["option" + optionPosition] == optionValue) {
              isVariantFound = true;
            } else {
              isVariantFound = false;
              break;
            }
          }
          if (isVariantFound) {
            variantId = eachVariant.id;
            return;
          }
        }
      });
      if (variantId) {
      	return rtAddItemToCartRequest(variantId, 1);
      }
    } 
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  function rtUpdateProgressBar(cartTotalValue) {
    let fTotalValue = parseFloat(cartTotalValue / 100);
    let fLimitValue = parseFloat({{ section.settings.cart-offer-price }});
    let fRemainingAmount = fLimitValue - fTotalValue;
    if (fRemainingAmount <= 0) {
      $('.custom-cart-offer').html('<strong>{{ section.settings.cart-offer-reached-message }}</strong>');
      $('.rt-progress-bar').css('width','100%');
      $('.rt-progress-bar').addClass('progress-goal-reached');
    } else {
      $('.custom-cart-offer').html(`Spend <strong> $${fRemainingAmount.toFixed(FIX_DECIMALS)}</strong> To Get a <strong> Free Mystery Bag!</strong>`);
      let progressPercent = fTotalValue / fLimitValue * 100;
      $('.rt-progress-bar').css('width', progressPercent + '%');
      $('.rt-progress-bar').removeClass('progress-goal-reached');
    }
  }

  function _rtCartBaseRequest(url, id, quantity) {
    // returns promise
    id = parseInt(id);
    return $.ajax({
      type: "POST",
      url: '/cart/' + url,
      data: {
        'id':  id,
        'quantity': quantity
      },
      dataType: 'json'
    });
  }

  function rtAddItemToCartRequest(id, quantity) {
    return _rtCartBaseRequest("add.js", id, quantity);
  }

  function rtChangeItemInCartRequest(id, quantity) {
    return _rtCartBaseRequest("change.js", id, quantity);
  }

  async function rtUpdateGoalItem() {
    // callable from outside
    let response = new Promise((resolve, reject) => {
      resolve();
    });
    await $.getJSON('/cart.js', function(cart) {
      response = _rtUpdateGoalItemStatus(cart.total_price, cart.items);
    });
    return response;
  }

  function _rtUpdateGoalItemStatus(cartTotalValue, cartItems) {
    {% if section.settings.cart-offer-product != blank %}
      let fTotalValue = parseFloat(cartTotalValue / 100);
      let fLimitValue = parseFloat({{ section.settings.cart-offer-price }});
      let isLimitReached = (fTotalValue - fLimitValue >= 0) ? true : false;

      let goalItemQuantity = 0;
      let goalItems = cartItems.filter(item => item.id == FREE_PRODUCT_VARIANT_ID);
      if (goalItems.length) {
        goalItemQuantity = goalItems[0].quantity;
      } 

      if (isLimitReached) {
        if (goalItemQuantity < 1) {
          return rtAddItemToCartRequest(FREE_PRODUCT_VARIANT_ID, 1);
        } else if (goalItemQuantity > 1) {
          return rtChangeItemInCartRequest(FREE_PRODUCT_VARIANT_ID, 1);
        }
      } else {
        if (goalItemQuantity != 0) {
          return rtChangeItemInCartRequest(FREE_PRODUCT_VARIANT_ID, 0);
        }
      }
    {% endif %}

    // return empty promise if nothing was changed
    return new Promise((resolve, reject) => {
      resolve();
    });
  }

  function rtPopulateCart(cart) {
    $('.rt-item-container').empty();

    if (cart.items.length > 0) {
      for (const cartItem of cart.items) {
        let price = (cartItem.final_price / 100).toFixed(FIX_DECIMALS);
        let featuredImage = NO_IMAGE_URL;
        if (cartItem.featured_image.url) {
          featuredImage = rtGetImageSrc(cartItem.featured_image.url);
        } 

        let itemClass = "";
        let freeItemExtraTitle = "";
      {% if section.settings.cart-offer-product != blank %}
        if (cartItem.product_id == {{ section.settings.cart-offer-product.id }}) {
          itemClass = "free-item";
          freeItemExtraTitle = `<br><span class='rt-promotion-cart'>${FREE_ITEM_EXTRA_TITLE}</span>`;
        } 
      {% endif %}

        $('.rt-item-container').append(
          `<div class='rt-item ${itemClass}' data-product-handle='${cartItem.handle}' data-variant-id='${cartItem.id}'>
            <div class='rt-item-image-container'>
              <a href='${cartItem.url}'>
                <img class='rt-item-image' src='${featuredImage}'>
              </a>
            </div>
            <div class='rt-item-right-content'>
              <div class='rt-item-title-price-container'>
                <p class='rt-item-title'>${cartItem.title}${freeItemExtraTitle}</p>
                <div class='rt-item-price-container'>
                  <p class='rt-item-price'>$${price}<span class='rt-item-price-icon'> x </span><span class='rt-item-quantity'>${cartItem.quantity}</span></p>
                </div>
              </div>
              <div class='rt-item-quantity-delete-container'>
                <div class='rt-quantity-container'>
                  <input type='button' class='rt-input-button minus' value='-'><input type='text' value='${cartItem.quantity}' class='input-text qty' size='4'><input type='button' class='rt-input-button plus' value='+'>
                </div>
                <div class='rt-item-delete-container'>
                  <span class="material-icons-outlined">delete</span>
                </div>
              </div>
              <p class='rt-out-of-stock-error'>Quantity not available</p>
            </div>
          </div>`);
      }
      $('.rt-subtotal-price').text(`$${(cart.total_price / 100).toFixed(FIX_DECIMALS)}`);
      $('.rt-custom-cart-bottom-container').css('display', 'block');
    } else {
      $('.rt-item-container').html('<p class="rt-cart-empty">Cart is empty</p>');
      $('.rt-custom-cart-bottom-container').css('display', 'none');
    }
  }

  function rtLoadCart() {
    $.getJSON('/cart.js', function(cart) {
  
      // fill up cart the first time quickly
      rtPopulateCart(cart);  

      // addon products
      rtPopulateAddons(cart);   

      rtUpdateProgressBar(cart.total_price);

      // add free product if limit reached, delete if limit not reached but free product still present
      _rtUpdateGoalItemStatus(cart.total_price, cart.items)
      .then(() => {
        $.getJSON('/cart.js', function(updatedCart) {  // get the cart updated with the goal item if it's reached
          rtPopulateCart(updatedCart);
          
          // update cart item number
          $('#CartCount').text(updatedCart.item_count);
        });
      });
  
    });
  }

  // delete functionality listener
  $(document).on('click', '.rt-item-delete-container span', function(e) {
    let productId = $(this).closest('.rt-item').data('variant-id');
    
    // show loading icon while deleting
    $(this).closest('.rt-item')
      .find('.rt-item-delete-container')
      .html(`<img class="rt-loading-icon" src="${LOADING_ICON_URL}">`);

    rtChangeItemInCartRequest(productId, 0)
    .then(() => {
      rtLoadCart();
    });
  });
  
  // quantity input listener
  $(document).on('click', '.rt-input-button', function () {
    let $input = $(this).parent().find(".input-text");

    let value = parseInt($input.val());
    if (!isNaN(value)) {
      if ($(this).attr("class").includes("minus")) {
        value -= 1;
        value = value < 1 ? 1 : value;
      } else if ($(this).attr("class").includes("plus")) {
        value += 1;
      }

      let variantId = $(this).closest(".rt-item").data("variant-id");
      rtChangeItemInCartRequest(variantId, value)
      .then(response => {
        let product = response.items.find(item => item.id == variantId);
        if (product) {
          if (product.quantity < value) {
             $(this).closest(".rt-item-right-content").find(".rt-out-of-stock-error").css("display", "block");
          } else {
            $input.val(value);
            $input.change();
            rtLoadCart();
          }
        }
      });
    }
  });

  // addon product options panel
  $(document).on('click', '.rt-addon-product-button', function () {
    let optionsContainer = $(this).closest(".rt-addon-product").find(".rt-addon-product-bottom");
    if ($(this).attr("class").includes("rt-add-addon-product")) {
      let productUrl = $(this).data("product-url");
      let optionSelectors = optionsContainer.find("select");
      let optionsMappedByPosition = new Map();
      for (const eachOptionSelector of optionSelectors) {
        optionsMappedByPosition.set(eachOptionSelector.dataset.productOption, eachOptionSelector.value);
      }
      rtAddAddonProduct(productUrl, optionsMappedByPosition)
      .then((response) => {
        rtLoadCart();
        $('.rt-main-item-container').animate({ scrollTop: 0 }, "slow");
      })
      .catch((error) => {
        let errorMsgHtml = $(this).closest(".rt-addon-product").find(".rt-out-of-stock-error");
        errorMsgHtml.text(error.responseJSON.description);
        errorMsgHtml.css("margin-top", "10px");
        errorMsgHtml.css("display", "block");
      });
    } else {
      $(".rt-addon-product-bottom").removeClass("active");
      $(".rt-addon-product-button:not(.only-default)").removeClass("rt-add-addon-product");
      $(".rt-addon-product-button:not(.only-default)").text("Options");
      $(this).addClass("rt-add-addon-product");
      $(this).text("Add product");
      optionsContainer.addClass("active");
    }
  });
  

  $('#CartButton').on('click', function(e) {
    e.preventDefault();
    rtLoadCart();
    rtToggleCart(e);
  });

  $('.rt-custom-cart-overlay').on('click', function(e) {
  	rtToggleCart(e);
  });

  $('.rt-top-icon-container span').on('click', function(e) {
  	rtToggleCart(e);
  });