from django.shortcuts import render


def tree(request):
    return render(request, "skills/tree.html")
