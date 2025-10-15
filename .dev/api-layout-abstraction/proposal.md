# Can we bet arbitrary layouts stored in the API?

<div>
    <p>key</p>
    <p>value</p>
...



<h1> => <h3 style="font-size: xx-large">
<h2> => <h3 style="font-size: x-large">
<h3> => <h3>
<h4> => <h3 style="font-size: medium">
<h5> => <h3 style="font-size: small">
<h6> => <h3 style="font-size: x-small">

<i> => font-style
<b> => font-weight


We might be able to encode arbitrary information in `font-family` since browsers fallback it

For divs maybe gradient which maps to background-image??


Else we always use hidden elements to encode.

As an example we could encode all *content* inside ex. <p> tags which allows the to be viewed by other clients then we have a hidden `<p display:none>` which contains mapping data:
`jsonkey` => proepr element, properties and proper css.